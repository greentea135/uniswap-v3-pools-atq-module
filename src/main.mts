import fetch from "node-fetch";
import { ContractTag, ITagService } from "atq-types";

const SUBGRAPH_URLS: Record<string, { decentralized: string }> = {
  // Ethereum Mainnet, deployed by the Uniswap team address (0xddaa...0f7f)
  "1": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
  },
  // Optimism, deployed by the Uniswap team address (0xddaa...0f7f)
  "10": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj",
  },
  // BSC Mainnet, deployed by the Uniswap team address (0xddaa...0f7f)
  "56": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/F85MNzUGYqgSHSHRGgeVMNsdnW1KtZSVgFULumXRZTw2",
  },
  // Polygon, deployed by the Uniswap team address (0xddaa...0f7f)
  "137": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm",
  },
  // Base Mainnet, deployed by the Uniswap team address (0xddaa...0f7f)
  "8453": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG",
  },
  // Arbitrum One, deployed by the Uniswap team address (0xddaa...0f7f)
  "42161": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM",
  },
  // Celo, deployed by the Uniswap team address (0xddaa...0f7f)
  "42220": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/ESdrTJ3twMwWVoQ1hUE2u7PugEHX3QkenudD6aXCkDQ4",
  },
  // Avalanche C-Chain, deployed by the Uniswap team address (0xddaa...0f7f)
  "43114": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/GVH9h9KZ9CqheUEL93qMbq7QwgoBu32QXQDPR6bev4Eo",
  },
};

interface PoolToken {
  id: string;
  name: string;
  symbol: string;
}

interface Pool {
  id: string;
  createdAtTimestamp: number;
  token0: PoolToken;
  token1: PoolToken;
}

interface GraphQLData {
  pools: Pool[];
}

interface GraphQLResponse {
  data?: GraphQLData;
  errors?: { message: string }[]; // Assuming the API might return errors in this format
}

// defining headers for query
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const GET_POOLS_QUERY = `
query GetPools($lastTimestamp: Int) {
  pools(
    first: 1000,
    orderBy: createdAtTimestamp,
    orderDirection: asc,
    where: { createdAtTimestamp_gt: $lastTimestamp }
  ) {
    id
    createdAtTimestamp
    token0 {
      id
      name
      symbol
    }
    token1 {
      id
      name
      symbol
    }
  }
}
`;

function isError(e: unknown): e is Error {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as Error).message === "string"
  );
}

function containsInvalidValue(text: string): boolean {
  const containsHtml = /<[^>]*>/.test(text);
  const isEmpty = text.trim() === "";
  return isEmpty || containsHtml;
}

function truncateString(text: string, maxLength: number) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + "..."; // Subtract 3 for the ellipsis
  }
  return text;
}

async function fetchData(
  subgraphUrl: string,
  lastTimestamp: number
): Promise<Pool[]> {
  const response = await fetch(subgraphUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: GET_POOLS_QUERY,
      variables: { lastTimestamp },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const result = (await response.json()) as GraphQLResponse;
  if (result.errors) {
    result.errors.forEach((error) => {
      console.error(`GraphQL error: ${error.message}`);
    });
    throw new Error("GraphQL errors occurred: see logs for details.");
  }

  if (!result.data || !result.data.pools) {
    throw new Error("No pools data found.");
  }

  return result.data.pools;
}

function prepareUrl(chainId: string, apiKey: string): string {
  const urls = SUBGRAPH_URLS[chainId];
  if (!urls || isNaN(Number(chainId))) {
    const supportedChainIds = Object.keys(SUBGRAPH_URLS).join(", ");

    throw new Error(
      `Unsupported or invalid Chain ID provided: ${chainId}. Only the following values are accepted: ${supportedChainIds}`
    );
  }
  return urls.decentralized.replace("[api-key]", encodeURIComponent(apiKey));
}

function transformPoolsToTags(chainId: string, pools: Pool[]): ContractTag[] {
  const validPools: Pool[] = [];
  const rejectedNames: string[] = [];

  pools.forEach((pool) => {
    const token0Invalid = containsInvalidValue(pool.token0.name) || containsInvalidValue(pool.token0.symbol);
    const token1Invalid = containsInvalidValue(pool.token1.name) || containsInvalidValue(pool.token1.symbol);

    if (token0Invalid || token1Invalid) {
      // Reject pools where any of the token names or symbols are empty or contain invalid content
      if (token0Invalid) {
        rejectedNames.push(`Contract: ${pool.id} rejected due to invalid token symbol/name - Token0: ${pool.token0.name}, Symbol: ${pool.token0.symbol}`);
      }
      if (token1Invalid) {
        rejectedNames.push(`Contract: ${pool.id} rejected due to invalid token symbol/name - Token1: ${pool.token1.name}, Symbol: ${pool.token1.symbol}`);
      }
    } else {
      validPools.push(pool);
    }
  });

  if (rejectedNames.length > 0) {
    console.log("Rejected contracts:", rejectedNames);
  }

  return validPools.map((pool) => {
    const maxSymbolsLength = 45;
    const symbolsText = `${pool.token0.symbol}/${pool.token1.symbol}`;
    const truncatedSymbolsText = truncateString(symbolsText, maxSymbolsLength);

    return {
      "Contract Address": `eip155:${chainId}:${pool.id}`,
      "Public Name Tag": `${truncatedSymbolsText} Pool`,
      "Project Name": "Uniswap v3",
      "UI/Website Link": "https://uniswap.org",
      "Public Note": `The liquidity pool contract on Uniswap v3 for the ${pool.token0.name} (${pool.token0.symbol}) / ${pool.token1.name} (${pool.token1.symbol}) pair.`,
    };
  });
}

// The main logic for this module
class TagService implements ITagService {
  // Using an arrow function for returnTags
  returnTags = async (
    chainId: string,
    apiKey: string
  ): Promise<ContractTag[]> => {
    let lastTimestamp: number = 0;
    let allTags: ContractTag[] = [];
    let isMore = true;

    const url = prepareUrl(chainId, apiKey);

    while (isMore) {
      try {
        const pools = await fetchData(url, lastTimestamp);
        allTags.push(...transformPoolsToTags(chainId, pools));

        isMore = pools.length === 1000;
        if (isMore) {
          lastTimestamp = parseInt(
            pools[pools.length - 1].createdAtTimestamp.toString(),
            10
          );
        }
      } catch (error) {
        if (isError(error)) {
          console.error(`An error occurred: ${error.message}`);
          throw new Error(`Failed fetching data: ${error}`); // Propagate a new error with more context
        } else {
          console.error("An unknown error occurred.");
          throw new Error("An unknown error occurred during fetch operation."); // Throw with a generic error message if the error type is unknown
        }
      }
    }
    return allTags;
  };
}

// Creating an instance of TagService
const tagService = new TagService();

// Exporting the returnTags method directly
export const returnTags = tagService.returnTags;

