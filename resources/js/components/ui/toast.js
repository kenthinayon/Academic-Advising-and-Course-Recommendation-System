// Lightweight toast system (no external deps).
// Usage:
//   import { toast } from "./ui/toast";
//   toast.success("Saved!");
// Mount once near the root:
//   <ToastHost />

import React, { useEffect, useMemo, useState } from "react";

const listeners = new Set();
let idSeq = 1;

function emit() {
    for (const fn of listeners) fn();
}

const store = {
    items: [],
};

function addToast({ type = "info", message, title, duration = 3000 }) {
    const id = idSeq++;
    store.items = [
        ...store.items,
        {
            id,
            type,
            title,
            message,
            duration,
            createdAt: Date.now(),
        },
    ];
    emit();

    if (duration !== 0) {
        window.setTimeout(() => {
            removeToast(id);
        }, duration);
    }

    return id;
}

function removeToast(id) {
    const before = store.items.length;
    store.items = store.items.filter((t) => t.id !== id);
    if (store.items.length !== before) emit();
}

export const toast = {
    show(message, opts = {}) {
        return addToast({ ...opts, message, type: opts.type || "info" });
    },
    success(message, opts = {}) {
        return addToast({ ...opts, message, type: "success" });
    },
    error(message, opts = {}) {
        return addToast({ ...opts, message, type: "error", duration: opts.duration ?? 4500 });
    },
    info(message, opts = {}) {
        return addToast({ ...opts, message, type: "info" });
    },
    warning(message, opts = {}) {
        return addToast({ ...opts, message, type: "warning" });
    },
    dismiss(id) {
        removeToast(id);
    },
    dismissAll() {
        if (!store.items.length) return;
        store.items = [];
        emit();
    },
};

export function ToastHost({ position = "top-right" }) {
    const [, force] = useState(0);

    useEffect(() => {
        const fn = () => force((x) => x + 1);
        listeners.add(fn);
        return () => listeners.delete(fn);
    }, []);

    const items = useMemo(() => store.items, [store.items.length]);

    return (
        <div className={`toast-host toast-host--${position}`} aria-live="polite" aria-relevant="additions">
            {items.map((t) => (
                <div key={t.id} className={`toast toast--${t.type}`} role={t.type === "error" ? "alert" : "status"}>
                    <div className="toast__body">
                        {t.title ? <div className="toast__title">{t.title}</div> : null}
                        <div className="toast__message">{t.message}</div>
                    </div>
                    <button
                        type="button"
                        className="toast__close"
                        aria-label="Dismiss notification"
                        onClick={() => removeToast(t.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
