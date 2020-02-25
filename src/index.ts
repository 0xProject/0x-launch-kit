#!/usr/bin/env node

import * as fs from 'fs';
import * as inquirer from 'inquirer';

import { buildDockerComposeYml, BuildOptions, Network } from './build';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const mockERC721Address = '0x07f96aa816c1f244cbc6ef114bb2b023ba54a2eb';

const zeroExAsciiArt = `

............................................................
............................................................
............................................................
..........................,,+I7?~...........................
.....................~DDDDDDDDDDDDDDDD8,....................
..................$DDDDDDDDDDDDDDDDDDDDDDD..................
................DDDDDDDDDDDDDDDDDDDDDDDD....................
..............DDDDDDDDDDDDDDDDDDDDDDDD......=D..............
............=DDDDDDDDDDDDDDDDDDDDDDN......8DDDDD............
............:DDDDDDDDDDDDDDDDDDDDO......ODDDDDDDD...........
..............DDDDDDDD...DDDDDD,......~DDDDDDDDDDD..........
.........D.....DDDDD......?DD...........=DDDDDDDDDD.........
........ZDD:....DD:.......................NDDDDDDDDD........
.......,DDDD7..............................DDDDDDDDDD.......
.......DDDDDDN.............................,NDDDDDDDD.......
.......DDDDDDDD...........................,DDDDDDDDDDD......
.......DDDDDDDDD.........................NDDDDDDDDDDDD......
......7DDDDDDDDDD,.......................DDDDDDDDDDDDD......
......DDDDDDDDDDDDI.......................NDDDDDDDDDDD......
......ZDDDDDDDDDDDD8.......................DDDDDDDDDDD......
......,DDDDDDDDDDDDD........................8DDDDDDDDD......
.......DDDDDDDDDDD...........................?DDDDDDDD......
.......NDDDDDDDDZ,............................,DDDDDD.......
.......,DDDDDDDDD...............................NDDDD.......
........8DDDDDDDDD........................OD.....DDD,.......
.........DDDDDDDDDD?...........DDD.......DDDD.....N:........
..........NDDDDDDDDDD?.......DDDDDD=...DDDDDDD+.............
...........DDDDDDDDDO......NDDDDDDDDDDDDDDDDDDDD............
............ODDDDD:......DDDDDDDDDDDDDDDDDDDDDDD............
.............,NN~.....,NDDDDDDDDDDDDDDDDDDDDDD8.............
....................~DDDDDDDDDDDDDDDDDDDDDDDD,..............
..................?DDDDDDDDDDDDDDDDDDDDDDD$.................
.....................DDDDDDDDDDDDDDDDDD+....................
..........................+DDDDDDZ,.........................
............................................................
............................................................
............................................................
............................................................
............................................................`;

function getRpcUrl(network: Network): string {
    switch (network) {
        case 'mainnet':
            return 'https://mainnet.infura.io/';
        case 'kovan':
            return 'https://kovan.infura.io/';
        case 'ropsten':
            return 'https://ropsten.infura.io/';
        case 'rinkeby':
            return 'https://rinkeby.infura.io/';
        case 'ganache':
            return 'http://ganache:8545/';
        case 'custom':
            return 'http://localhost:8545/';
    }
}

const isAddress = (s: string) => /(0x)?[0-9a-fA-F]{40}/.test(s);

async function main() {
    const networkChoices: Array<{ name: string; value: Network }> = [
        {
            name: 'Mainnet',
            value: 'mainnet',
        },
        {
            name: 'Kovan',
            value: 'kovan',
        },
        {
            name: 'Ropsten',
            value: 'ropsten',
        },
        {
            name: 'Rinkeby',
            value: 'rinkeby',
        },
        {
            name: 'Ganache',
            value: 'ganache',
        },
        {
            name: 'Custom',
            value: 'custom',
        },
    ];

    const answers = await inquirer.prompt<any>([
        {
            type: 'list',
            name: 'tokenType',
            message:
                zeroExAsciiArt +
                `\n\n\n
            🚀 Welcome to the 0x Launch Kit Wizard! 🚀 \n
            Start your own exchange in under a minute

            ----------------------------------------------------------------

            Select the kind of token you want to support on your exchange`,
            choices: ['ERC20', 'ERC721'],
        },
        {
            type: 'list',
            name: 'network',
            message: 'Select the network you want to use',
            choices: networkChoices,
        },
        {
            type: 'input',
            name: 'rpcUrl',
            message: 'Select the RPC URL you want to use',
            default: (answers: any) => {
                return getRpcUrl(answers.network);
            },
            validate: (rpcUrl: string) => {
                return /https?:\/\/.+/.test(rpcUrl) ? true : 'Please enter a valid URL';
            },
            when: (answers: any) => answers.network !== 'ganache',
        },
        {
            type: 'input',
            name: 'relayerUrl',
            message:
                'Launch Kit will create a backend Relayer. Enter the public URL for the backend Relayer or leave default:',
            default: 'http://localhost:3000/sra/v3',
            validate: (rpcUrl: string) => {
                return /https?:\/\/.+/.test(rpcUrl) ? true : 'Please enter a valid URL';
            },
        },
        {
            type: 'input',
            name: 'relayerWebsocketUrl',
            message:
                'Launch Kit will create a backend Relayer. Enter the public URL for the backend websocket or leave default:',
            default: 'ws://localhost:3000/sra/v3',
            validate: (rpcUrl: string) => {
                return /wss?:\/\/.+/.test(rpcUrl) ? true : 'Please enter a valid Websocket URL';
            },
        },
        {
            type: 'input',
            name: 'collectibleAddress',
            message: 'Enter the address of the collectible:',
            default: ZERO_ADDRESS,
            validate: (answer: string) => {
                return isAddress(answer) ? true : 'Please enter a valid address';
            },
            when: (answers: any) => answers.tokenType === 'ERC721' && answers.network !== 'ganache',
        },
        {
            type: 'input',
            name: 'collectibleName',
            message: 'Enter the name of the collectible:',
            validate: (answer: string) => {
                return answer.length > 0 ? true : 'Please enter a name';
            },
            when: (answers: any) => answers.tokenType === 'ERC721' && answers.network !== 'ganache',
        },
        {
            type: 'input',
            name: 'collectibleDescription',
            message: 'Enter the description of the collectible (optional):',
            when: (answers: any) => answers.tokenType === 'ERC721' && answers.network !== 'ganache',
        },
        {
            type: 'input',
            name: 'feeRecipient',
            message: 'Enter the fee recipient:',
            default: ZERO_ADDRESS,
            validate: (answer: string) => {
                return isAddress(answer) ? true : 'Please enter a valid address';
            },
        },
        {
            type: 'number',
            name: 'makerFee',
            message: 'Enter the maker fee:',
            default: 0,
            when: (answers: any) => answers.feeRecipient !== ZERO_ADDRESS,
        },
        {
            type: 'number',
            name: 'takerFee',
            message: 'Enter the taker fee:',
            default: 0,
            when: (answers: any) => answers.feeRecipient !== ZERO_ADDRESS,
        },
        {
            type: 'list',
            name: 'theme',
            message: 'Select the theme you want to use',
            choices: [
                {
                    name: 'Light',
                    value: 'light',
                },
                {
                    name: 'Dark',
                    value: 'dark',
                },
            ],
        },
        {
            type: 'number',
            name: 'port',
            message: 'Enter the port for the frontend server:',
            default: 3001,
            validate: (port: number) => {
                return 1 <= port && port <= 65535 ? true : 'Enter a port between 1 and 65535';
            },
        },
    ]);

    console.log(
        `
    Wizard complete.

    🚀🚀🚀🚀 .... Preparing for liftoff .... 🚀🚀🚀🚀

    Run << docker-compose up >> and open your browser to http://localhost:` +
            answers.port +
            `\n\n\n\n\n`,
    );

    const rpcUrl = answers.network === 'ganache' ? 'http://ganache:8545' : answers.rpcUrl;

    const options: BuildOptions = {
        tokenType: answers.tokenType,
        network: answers.network,
        rpcUrl,
        relayerUrl: answers.relayerUrl,
        relayerWebsocketUrl: answers.relayerWebsocketUrl,
        feeRecipient: answers.feeRecipient || ZERO_ADDRESS,
        theme: answers.theme,
        port: answers.port,
        makerFee: answers.makerFee || 0,
        takerFee: answers.takerFee || 0,
        collectibleAddress: answers.collectibleAddress || mockERC721Address,
        collectibleName: answers.collectibleName || '',
        collectibleDescription: answers.collectibleDescription || '',
    };

    const dockerComposeYml = buildDockerComposeYml(options);

    const composeFilePath = process.argv[2] || 'docker-compose.yml';

    fs.writeFileSync(composeFilePath, dockerComposeYml);
}

main();
