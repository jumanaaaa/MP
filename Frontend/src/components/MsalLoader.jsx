// MsalLoader.jsx
import React, { useState, useEffect } from "react";

export default function MsalLoader({ instance, children }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        instance.initialize().then(() => {
            console.log("MSAL initialized");
            setReady(true);
        });
    }, []);

    if (!ready) return <div>Loading authentication…</div>;

    return children;
}
