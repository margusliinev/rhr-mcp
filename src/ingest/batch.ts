const createBatch = <T>(insert: (rows: T[]) => Promise<unknown>) => {
    const rows: T[] = [];
    let inserted = 0;

    const flush = async () => {
        if (rows.length === 0) {
            return;
        }
        await insert(rows);
        inserted += rows.length;
        rows.length = 0;
    };

    const push = (row: T) => {
        rows.push(row);
    };

    return {
        push,
        flush,
        get inserted() {
            return inserted;
        },
        get size() {
            return rows.length;
        }
    };
};

export { createBatch };
