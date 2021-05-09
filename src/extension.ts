import * as vscode from 'vscode';
import axios from 'axios';

const PREFIX = 'discordjs-helper';
const SOURCES = [
    {
        label: 'Discord.js Master',
        details: 'Documentation for Discord.js Master',
        source: 'master',
    },
    {
        label: 'Discord.js Stable',
        details: 'Documentation for Discord.js Stable',
        source: 'stable',
    },
    {
        label: 'Discord.js Commando',
        details: 'Documentation for Discord.js Commando',
        source: 'commando',
    },
    {
        label: 'Discord.js RPC',
        details: 'Documentation for Discord.js RPC',
        source: 'rpc',
    },
    {
        label: 'Discord.js Collection',
        details: 'Documentation for Discord.js Collection',
        source: 'collection',
    },
];

const cache = new Map<string, any>();

export async function activate(context: vscode.ExtensionContext) {
    await Promise.all([fetchDocs('master'), fetchDocs('stable'), fetchDocs('commando'), fetchDocs('rpc')]);

    let disposable = vscode.commands.registerCommand(`${PREFIX}.docs`, () => getDocumentationSource());
    void context.subscriptions.push(disposable);
}

async function fetchDocs(source: string) {
    void vscode.window.showInformationMessage(`[Discord.js] Fetching docs for ${source}...`);

    try {
        const { data: res } = await axios.get(`https://raw.githubusercontent.com/discordjs/${['master', 'stable'].includes(source) ? 'discord.js' : source}/docs/${['master', 'stable'].includes(source) ? source : 'master'}.json`, { responseType: 'json' });
        if (!res) {
            return;
        }

        cache.set(source, res);
        return res;
    } catch {
        void vscode.window.showErrorMessage(`[Discord.js] Could not fetch docs for "DiscordJS#${source}"`);
        return null;
    }
}

async function getDocumentationSource() {
    const src = await vscode.window.showQuickPick(SOURCES, { matchOnDetail: true });
    if (!src) {
        return;
    }

    if (cache.has(src.source)) {
        return showDocs(cache.get(src.source), src.source);
    } else {
        return showDocs(await fetchDocs(src.source), src.source);
    }
}

interface DocsInterface {
    label: string;
    details: string;
    url: string;
}

async function showDocs(data: any, source: string) {
    const arr: DocsInterface[] = [];

    const buildSrc = (s: string) => {
        switch (s) {
            case 'master':
            case 'stable':
                return `https://discord.js.org/#/docs/main/${s}`;
            case 'commando':
            case 'rpc':
            case 'collection':
                return `https://discord.js.org/#/docs/${s}/master`;
            default:
                return `https://discord.js.org`;
        }
    };

    // classes
    if (data.classes) {
        data.classes.forEach((cls: any) => {
            arr.push({ label: `class:${cls.name}`, details: cls.description, url: `${buildSrc(source)}/class/${cls.name}` });

            // methods
            if (cls.methods) {
                cls.methods.map((m: any) => arr.push({ label: `${cls.name}:m-${m.name}`, details: m.description, url: `${buildSrc(source)}/class/${cls.name}?scrollTo=${m.name}` }));
            }

            // properties
            if (cls.props) {
                cls.props.map((m: any) => arr.push({ label: `${cls.name}:p-${m.name}`, details: m.description, url: `${buildSrc(source)}/class/${cls.name}?scrollTo=${m.name}` }));
            }

            // events
            if (cls.events) {
                cls.events.map((m: any) => arr.push({ label: `${cls.name}:e-${m.name}`, details: m.description, url: `${buildSrc(source)}/class/${cls.name}?scrollTo=e-${m.name}` }));
            }
        });
    }

    // typedefs
    if (data.typedefs) {
        data.typedefs.forEach((cls: any) => {
            arr.push({ label: `typedef:${cls.name}`, details: cls.description, url: `${buildSrc(source)}/typedef/${cls.name}` });
        });
    }

    const response = await vscode.window.showQuickPick(arr);
    if (response) {
        await vscode.env.openExternal(vscode.Uri.parse(response.url, true));
    }
}

export function deactivate() {}
