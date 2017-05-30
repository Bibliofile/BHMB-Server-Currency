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

export function loadCSS(path: string): void {
    // Already loaded?
    if (document.querySelector(`link[href="${path}"]`)) {
        return;
    }

    let el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = path;
    document.head.appendChild(el);
}

export function loadJS(path: string, exportName: string): Promise<void> {
    if (!document.querySelector(`script[src="${path}"]`)) {
        let el = document.createElement('script');
        el.src = path;
        document.head.appendChild(el);
    }

    return new Promise<void>(resolve => {
        let check = () => {
            if (!!(window as any)[exportName]) {
                resolve();
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    });
}
