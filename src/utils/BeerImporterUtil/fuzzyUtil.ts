import Fuse from "fuse.js";

export function createFuzzy<T extends { name: string }>(list: T[]): Fuse<T> {
    return new Fuse(list, { keys: ['name'], threshold: 0.4 });
}

export function fuzzyFind<T extends { name: string }>(fuse: Fuse<T>, name: string): T | undefined {
    const result = fuse.search(name);
    if (result.length > 0) {
        return result[0].item;
    }
    return undefined;
}
