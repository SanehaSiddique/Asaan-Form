import { useEffect, useRef } from 'react';

export function useFormWebSocket(userId, onFieldUpdate) {
    const wsRef = useRef(null);
    const onFieldUpdateRef = useRef(onFieldUpdate);

    useEffect(() => {
        onFieldUpdateRef.current = onFieldUpdate;
    }, [onFieldUpdate]);

    useEffect(() => {
        if (!userId) return;

        const ws = new WebSocket(`ws://localhost:3000`);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'auth', userId }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'field_update') {
                    if (onFieldUpdateRef.current) {
                        onFieldUpdateRef.current(data.field_key, data.value);
                    }
                }
            } catch (e) {}
        };

        ws.onerror = (e) => console.error('WS error', e);
        ws.onclose = () => console.log('WS closed');

        return () => ws.close();
    }, [userId]);
}
