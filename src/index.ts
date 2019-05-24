#!/usr/bin/env node

import * as fs from 'fs';
import * as inquirer from 'inquirer';

import { buildDockerComposeYml, BuildOptions, Network } from './build';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function getRpcUrl(network: Network): string {
    switch (network) {
        case 'mainnet':
            return 'https://mainnet.infura.io/';
        case 'kovan':
            return 'https://kovan.infura.io/';
        case 'ropsten':
            return 'https://ropsten.infura.io/';
        case 'ganache':
            return 'http://ganache:8545/';
        case 'custom':
            return 'http://localhost:8545/';
    }
}

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
            message: 'Select the kind of token you want to support on your exchange',
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
            name: 'feeRecipient',
            message: 'Enter the fee recipient:',
            default: ZERO_ADDRESS,
            validate: (answer: string) => {
                return /(0x)?[0-9a-fA-F]{40}/.test(answer) ? true : 'Please enter a valid address';
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
            message: 'Enter the port for the server:',
            default: 3001,
            validate: (port: number) => {
                return 1 <= port && port <= 65535 ? true : 'Enter a port between 1 and 65535';
            },
        },
    ]);

    const rpcUrl = answers.network === 'ganache' ? 'http://ganache:8545' : answers.rpcUrl;

    const options: BuildOptions = {
        tokenType: answers.tokenType,
        network: answers.network,
        rpcUrl,
        feeRecipient: answers.feeRecipient || ZERO_ADDRESS,
        theme: answers.theme,
        port: answers.port,
        makerFee: answers.makerFee || 0,
        takerFee: answers.takerFee || 0,
    };

    const dockerComposeYml = buildDockerComposeYml(options);

    const composeFilePath = process.argv[2] || 'docker-compose.yml';

    fs.writeFileSync(composeFilePath, dockerComposeYml);
}

main();
