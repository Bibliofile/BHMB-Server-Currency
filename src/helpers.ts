export function merge<T>(...buckets: T[][]): T[] {
    let hash = new Set<T>();

    for (let bucket of buckets) {
        bucket.forEach(item => hash.add(item));
    }

    return Array.from(hash.keys());
}

let entityMap: {[k: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

export function stripHTML(html: string) {
    return html.replace(/[&<>"'`=\/]/g, s => entityMap[s]);
}

export function debounce(fn: () => void, delay: number) {
    let timeout = 0;
    const run = () => {
        fn();
        timeout = 0;
    };

    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(run, delay);
    };
}
