"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Check, AlertTriangle, Loader2 } from "lucide-react";
import { providers, testConnection } from "@/lib/ai";
import { loadSettings, saveSettings } from "@/lib/storage";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const [provider, setProvider] = React.useState<string>("");
    const [apiKey, setApiKey] = React.useState<string>("");
    const [model, setModel] = React.useState<string>("");
    const [baseURL, setBaseURL] = React.useState<string>("");

    const [status, setStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [message, setMessage] = React.useState("");

    React.useEffect(() => {
        if (open) {
            loadSettings().then((settings) => {
                if (settings) {
                    setProvider(settings.provider || "");
                    setApiKey(settings.apiKey || "");
                    setModel(settings.model || "");
                    setBaseURL(settings.baseURL || "");
                }
            });
            setStatus('idle');
            setMessage("");
        }
    }, [open]);

    const handleTestAndSave = async () => {
        if (!provider) {
            // Just save if no provider selected (clearing)
            await saveSettings({ provider: undefined, apiKey: undefined, model: undefined, baseURL: undefined });
            window.dispatchEvent(new Event('kitaab-settings-changed'));
            onOpenChange(false);
            return;
        }

        if (!apiKey && providers.find(p => p.id === provider)?.apiKeyRequired) {
            setStatus('error');
            setMessage("API Key is required");
            return;
        }

        setStatus('testing');
        const isConnected = await testConnection(provider, apiKey, baseURL);

        if (isConnected) {
            setStatus('success');
            setMessage("Connected successfully!");
            await saveSettings({ provider, apiKey, model, baseURL });
            window.dispatchEvent(new Event('kitaab-settings-changed'));
            setTimeout(() => onOpenChange(false), 1000);
        } else {
            setStatus('error');
            setMessage("Connection failed. Check API key and CORS settings.");
        }
    };

    const selectedProvider = providers.find(p => p.id === provider);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white dark:bg-neutral-900 p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
                    <Dialog.Title className="text-mauve12 m-0 text-[17px] font-medium mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                        <Settings className="w-5 h-5" />
                        AI Settings
                    </Dialog.Title>

                    <div className="flex flex-col gap-4 mb-4">
                        {/* Provider Select */}
                        <fieldset className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Provider</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors dark:border-neutral-700 dark:text-neutral-100"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value="">None (Disable AI)</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </fieldset>

                        {/* API Key */}
                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">API Key</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors dark:border-neutral-700 dark:text-neutral-100"
                                    type="password"
                                    placeholder="sk-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </fieldset>
                        )}

                        {/* Model */}
                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Model</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors dark:border-neutral-700 dark:text-neutral-100"
                                    type="text"
                                    placeholder={selectedProvider?.models[0] || "Model ID"}
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    list="model-suggestions"
                                />
                                <datalist id="model-suggestions">
                                    {selectedProvider?.models.map(m => (
                                        <option key={m} value={m} />
                                    ))}
                                </datalist>
                                <p className="text-[10px] text-neutral-500">
                                    Recommended: {selectedProvider?.models.join(", ")}
                                </p>
                            </fieldset>
                        )}

                        {/* Base URL (Optional, mostly for OpenRouter or proxies) */}
                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Base URL (Optional)</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors dark:border-neutral-700 dark:text-neutral-100"
                                    type="text"
                                    placeholder={selectedProvider?.baseURL}
                                    value={baseURL}
                                    onChange={(e) => setBaseURL(e.target.value)}
                                />
                            </fieldset>
                        )}
                    </div>

                    <div className="mt-2 text-sm">
                        {status === 'testing' && <div className="text-blue-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Testing connection...</div>}
                        {status === 'success' && <div className="text-green-500 flex items-center gap-2"><Check className="w-4 h-4" /> {message}</div>}
                        {status === 'error' && <div className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {message}</div>}
                    </div>

                    <div className="mt-[25px] flex justify-end gap-[10px]">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:shadow-neutral-400 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleTestAndSave}
                            disabled={status === 'testing'}
                            className="bg-green-100 text-green-900 hover:bg-green-200 focus:shadow-green-400 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none disabled:opacity-50"
                        >
                            Save Changes
                        </button>
                    </div>
                    <Dialog.Close asChild>
                        <button
                            className="text-neutral-500 hover:bg-neutral-100 focus:shadow-neutral-400 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
