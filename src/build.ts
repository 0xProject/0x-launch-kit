export type Network = 'mainnet' | 'kovan' | 'ropsten' | 'rinkeby' | 'ganache' | 'custom';

export interface BuildOptions {
    tokenType: 'ERC20' | 'ERC721';
    network: Network;
    rpcUrl: string;
    relayerUrl: string;
    relayerWebsocketUrl: string;
    feeRecipient: string;
    theme: 'light' | 'dark';
    port: number;
    makerFee: number;
    takerFee: number;
    collectibleAddress: string;
    collectibleName: string;
    collectibleDescription: string;
}

function getNetworkId(network: Network): number {
    switch (network) {
        case 'mainnet':
            return 1;
        case 'kovan':
            return 42;
        case 'ropsten':
            return 3;
        case 'rinkeby':
            return 4;
        case 'ganache':
        case 'custom':
            return 50;
    }
}

function getChainId(network: Network): number {
    switch (network) {
        case 'mainnet':
        case 'kovan':
        case 'rinkeby':
        case 'ropsten':
            return getNetworkId(network);
        case 'ganache':
        case 'custom':
            return 1337;
    }
}

export const buildDockerComposeYml = (options: BuildOptions) => {
    const basePath = options.tokenType === 'ERC20' ? '/erc20' : '/erc721';
    const theme = options.theme === 'light' ? 'LIGHT_THEME' : 'DARK_THEME';

    const isGanache = options.network === 'ganache';
    const collectiblesSource = isGanache ? 'mocked' : 'opensea';

    const networkId = getNetworkId(options.network);
    const chainId = getChainId(options.network);

    const ganacheService = `
  ganache:
    image: 0xorg/ganache-cli
    ports:
      - "8545:8545"`;
    const collectibleEnv = `
      REACT_APP_COLLECTIBLES_SOURCE: '${collectiblesSource}'
      REACT_APP_COLLECTIBLE_ADDRESS: '${options.collectibleAddress}'
      REACT_APP_COLLECTIBLE_NAME: '${options.collectibleName}'
      REACT_APP_COLLECTIBLE_DESCRIPTION: '${options.collectibleDescription}'
    `.trimLeft();

    return `
version: "3"
services:${isGanache ? ganacheService : ''}
  frontend:
    image: 0xorg/launch-kit-frontend:latest
    environment:
      REACT_APP_RELAYER_URL: '${options.relayerUrl}'
      REACT_APP_RELAYER_WS_URL: '${options.relayerWebsocketUrl}'
      REACT_APP_DEFAULT_BASE_PATH: '${basePath}'
      REACT_APP_THEME_NAME: '${theme}'
      REACT_APP_NETWORK_ID: ${networkId}
      REACT_APP_CHAIN_ID: ${chainId}
      ${options.tokenType === 'ERC20' ? '' : collectibleEnv}
    command: yarn build
    volumes:
        - frontend-assets:/app/build
  backend:
    image: 0xorg/launch-kit-backend:latest
    environment:
        HTTP_PORT: '3000'
        RPC_URL: '${options.rpcUrl}'
        NETWORK_ID: '${networkId}'
        CHAIN_ID: '${chainId}'
        WHITELIST_ALL_TOKENS: 'true'
        FEE_RECIPIENT: '${options.feeRecipient}'
        MAKER_FEE_UNIT_AMOUNT: '${options.makerFee}'
        TAKER_FEE_UNIT_AMOUNT: '${options.takerFee}'
        MESH_ENDPOINT: 'ws://mesh:60557'
    ports:
      - '3000:3000'
  mesh:
    image: 0xorg/mesh:7-0xv3
    restart: always
    environment:
        ETHEREUM_RPC_URL: '${options.rpcUrl}'
        ETHEREUM_CHAIN_ID: '${chainId}'
        VERBOSITY: 3
        RPC_ADDR: 'mesh:60557'
        # You can decrease the BLOCK_POLLING_INTERVAL for test networks to
        # improve performance. See https://0x-org.gitbook.io/mesh/ for more
        # Documentation about Mesh and its environment variables.
        BLOCK_POLLING_INTERVAL: '5s'
    ports:
        - '60557:60557'
        - '60558:60558'
        - '60559:60559'
  nginx:
    image: nginx
    ports:
        - '${options.port}:80'
    volumes:
        - frontend-assets:/usr/share/nginx/html
volumes:
    frontend-assets:
`.trimLeft();
};
