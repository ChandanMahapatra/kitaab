"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Check, AlertTriangle, Loader2, Trash2 } from "lucide-react";
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
            setMessage("Connection failed. Check your API key is valid and active.");
        }
    };

    const handleClearSettings = async () => {
        await saveSettings({ provider: undefined, apiKey: undefined, model: undefined, baseURL: undefined, tokensUsed: 0, totalCost: 0, hoverHighlightEnabled: false });
        setProvider("");
        setApiKey("");
        setModel("");
        setBaseURL("");
        window.dispatchEvent(new Event('kitaab-settings-changed'));
        onOpenChange(false);
    };

    const selectedProvider = providers.find(p => p.id === provider);

    const buttonClass = "px-4 py-1.5 text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground)] bg-transparent hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white rounded transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none";
    const saveButtonClass = "px-4 py-1.5 text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground)] bg-transparent hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white rounded transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none";

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-[var(--background)] border border-[var(--border-color)] p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50 text-[var(--foreground)]">
                    <Dialog.Title className="m-0 text-[17px] font-medium mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        AI Settings
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">
                        Configure your AI provider API key and model settings
                    </Dialog.Description>

                    <div className="flex flex-col gap-4 mb-4">
                        <fieldset className="flex flex-col gap-2">
                            <label className="text-sm font-semibold opacity-80">Provider</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value="">None (Disable AI)</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </fieldset>

                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold opacity-80">API Key</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                    type="password"
                                    placeholder="sk-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </fieldset>
                        )}

                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold opacity-80">Model</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
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
                                <p className="text-[10px] opacity-50">
                                    Recommended: {selectedProvider?.models.join(", ")}
                                </p>
                            </fieldset>
                        )}

                        {provider && (
                            <fieldset className="flex flex-col gap-2">
                                <label className="text-sm font-semibold opacity-80">Base URL (Optional)</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                    type="text"
                                    placeholder={selectedProvider?.baseURL}
                                    value={baseURL}
                                    onChange={(e) => setBaseURL(e.target.value)}
                                />
                            </fieldset>
                        )}
                    </div>

                    <div className="mt-2 text-sm">
                        {status === 'testing' && <div className="opacity-80 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Testing connection...</div>}
                        {status === 'success' && <div className="text-muted-emerald flex items-center gap-2"><Check className="w-4 h-4" /> {message}</div>}
                        {status === 'error' && <div className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {message}</div>}
                    </div>

                    <div className="mt-[25px] flex justify-between gap-[10px]">
                        <button
                            onClick={handleClearSettings}
                            className="text-xs font-semibold opacity-50 hover:opacity-100 transition-opacity"
                        >
                            Clear
                        </button>
                        <div className="flex gap-[10px]">
                            <button
                                onClick={() => onOpenChange(false)}
                                className={buttonClass}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTestAndSave}
                                disabled={status === 'testing'}
                                className={saveButtonClass}
                            >
                                {status === 'testing' ? 'Testing...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                    <Dialog.Close asChild>
                        <button
                            className="text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:shadow-neutral-400 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
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
