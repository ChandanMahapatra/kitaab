"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Check, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { providers, testConnection, isLocalProvider, fetchLocalModels } from "@/lib/ai";
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
    const [tokensUsed, setTokensUsed] = React.useState(0);
    const [totalCost, setTotalCost] = React.useState(0);
    const [showCostEstimate, setShowCostEstimate] = React.useState(false);
    const [discoveredModels, setDiscoveredModels] = React.useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            loadSettings().then((settings) => {
                if (settings) {
                    setProvider(settings.provider || "");
                    setApiKey(settings.apiKey || "");
                    setModel(settings.model || "");
                    setBaseURL(settings.baseURL || "");
                    setTokensUsed(settings.tokensUsed || 0);
                    setTotalCost(settings.totalCost || 0);
                    setShowCostEstimate(settings.showCostEstimate ?? true);
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
            await saveSettings({ provider, apiKey, model, baseURL, showCostEstimate });
            window.dispatchEvent(new Event('kitaab-settings-changed'));
            setTimeout(() => onOpenChange(false), 1000);
        } else {
            setStatus('error');
            setMessage(isLocalProvider(provider)
                ? "Connection failed. Ensure the local service is running and CORS is enabled."
                : "Connection failed. Check your API key is valid and active.");
        }
    };

    const handleClearSettings = async () => {
        await saveSettings({ provider: undefined, apiKey: undefined, model: undefined, baseURL: undefined, tokensUsed: 0, totalCost: 0, hoverHighlightEnabled: false, showCostEstimate: true });
        setProvider("");
        setApiKey("");
        setModel("");
        setBaseURL("");
        setTokensUsed(0);
        setTotalCost(0);
        setShowCostEstimate(true);
        window.dispatchEvent(new Event('kitaab-settings-changed'));
        onOpenChange(false);
    };

    const handleResetStats = async () => {
        const settings = await loadSettings();
        if (settings) {
            await saveSettings({ ...settings, tokensUsed: 0, totalCost: 0 });
        }
        setTokensUsed(0);
        setTotalCost(0);
        window.dispatchEvent(new Event('kitaab-settings-changed'));
    };

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        setModel('');
        setBaseURL('');
        setDiscoveredModels([]);
        setStatus('idle');
        setMessage('');
    };

    const handleFetchModels = async () => {
        if (!selectedProvider || !isLocalProvider(provider)) return;
        setIsFetchingModels(true);
        setMessage('');
        try {
            const effectiveBaseURL = baseURL || selectedProvider.baseURL;
            const models = await fetchLocalModels(provider, effectiveBaseURL);
            setDiscoveredModels(models);
            if (models.length > 0 && !model) {
                setModel(models[0]);
            }
            if (models.length === 0) {
                setMessage('No models found. Ensure the service is running and has models loaded.');
            }
        } catch (e) {
            setStatus('error');
            setMessage(e instanceof Error ? e.message : 'Failed to fetch models');
        } finally {
            setIsFetchingModels(false);
        }
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
                                onChange={(e) => handleProviderChange(e.target.value)}
                            >
                                <option value="">None (Disable AI)</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </fieldset>

                        {provider && selectedProvider?.apiKeyRequired && (
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
                                <div className="flex gap-2">
                                    <input
                                        className="flex h-9 w-full rounded-md border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        type="text"
                                        placeholder={selectedProvider?.models[0] || "Model ID"}
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        list="model-suggestions"
                                    />
                                    {isLocalProvider(provider) && (
                                        <button
                                            onClick={handleFetchModels}
                                            disabled={isFetchingModels}
                                            className={buttonClass}
                                            type="button"
                                            title="Fetch available models from local service"
                                            style={{ width: 'auto', whiteSpace: 'nowrap' }}
                                        >
                                            {isFetchingModels ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fetch'}
                                        </button>
                                    )}
                                </div>
                                <datalist id="model-suggestions">
                                    {(discoveredModels.length > 0 ? discoveredModels : selectedProvider?.models || []).map(m => (
                                        <option key={m} value={m} />
                                    ))}
                                </datalist>
                                {isLocalProvider(provider) ? (
                                    <p className="text-[10px] opacity-50">
                                        Click &quot;Fetch&quot; to discover available models, or type a model name.
                                    </p>
                                ) : (
                                    <p className="text-[10px] opacity-50">
                                        Recommended: {selectedProvider?.models.join(", ")}
                                    </p>
                                )}
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

                        {provider && isLocalProvider(provider) && (
                            <div className="text-[10px] opacity-60 p-2 border border-[var(--border-color)] rounded">
                                {provider === 'ollama' ? (
                                    <>
                                        <p className="font-semibold mb-1">Ollama Setup:</p>
                                        <p>Start Ollama with CORS enabled:</p>
                                        <code className="block mt-1 text-[9px] opacity-80 font-mono">OLLAMA_ORIGINS=* ollama serve</code>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold mb-1">LM Studio Setup:</p>
                                        <p>1. Open LM Studio and start the local server</p>
                                        <p>2. Enable CORS in Settings &gt; Server</p>
                                    </>
                                )}
                            </div>
                        )}

                        {provider && !isLocalProvider(provider) && (
                            <fieldset className="flex items-center gap-3">
                                <input
                                    id="showCostEstimate"
                                    type="checkbox"
                                    checked={showCostEstimate}
                                    onChange={(e) => setShowCostEstimate(e.target.checked)}
                                    className="h-4 w-4 rounded border-[var(--border-color)] bg-transparent text-primary focus:ring-primary"
                                />
                                <label htmlFor="showCostEstimate" className="text-sm font-semibold opacity-80 cursor-pointer">
                                    Show cost estimates in UI
                                </label>
                            </fieldset>
                        )}
                    </div>

                    <div className="mt-2 text-sm">
                        {status === 'testing' && <div className="opacity-80 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Testing connection...</div>}
                        {status === 'success' && <div className="text-muted-emerald flex items-center gap-2"><Check className="w-4 h-4" /> {message}</div>}
                        {status === 'error' && <div className="text-red-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {message}</div>}
                    </div>

                    {tokensUsed > 0 && (
                        <div className="mt-4 p-3 border border-[var(--border-color)] rounded-lg bg-[var(--background)]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold opacity-80">AI Usage Stats</span>
                                <button
                                    onClick={handleResetStats}
                                    className="text-[10px] opacity-50 hover:opacity-100 transition-opacity underline"
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <span className="opacity-60">Tokens: <span className="font-semibold opacity-80">{tokensUsed.toLocaleString()}</span></span>
                                {showCostEstimate && (
                                    <span className="opacity-60">Cost: <span className="font-semibold opacity-80">${totalCost.toFixed(4)}</span></span>
                                )}
                            </div>
                        </div>
                    )}

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
