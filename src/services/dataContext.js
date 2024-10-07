import {globalConfig} from "./config";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [];

//These constants need to match MWP UserDataVersionKeyEnum enum
export const ContentVersionKey = 0;

let cache = null;

export class DataContext {
    context = null;

    constructor(dataVersionKey, fetchDataFunction) {
        this.dataVersionKey = dataVersionKey;
        this.fetchDataFunction = fetchDataFunction;
        this.localStorageKey = `dataContext_${this.dataVersionKey}`;
        this.localStorageLastUpdatedKey = `dataContext_${this.dataVersionKey}_lastUpdated`;
    }

    async getData() {
        this.ensureLocalContextLoaded();
        if (!this.context || this.shouldVerifyServerVerions()) {
            let version = this.version();
            let data = await this.fetchData(version);
            if (data.version !== "No Change") {
                this.context = data;
                cache.setItem(this.localStorageKey, JSON.stringify(data));
            }
            cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime());
        }
        return this.context.data;
    }

    async fetchData(version) {
        return await this.fetchDataFunction(version);
    }

    ensureLocalContextLoaded() {
        if (this.context) return;
        this.verifyConfig();
        let localData = cache.getItem(this.localStorageKey);
        if (localData) {
            this.context = JSON.parse(localData);
        }
    }

    verifyConfig() {
        if (!cache) {
            cache = globalConfig.localStorage;
            if (!cache) throw new Error('dataContext: LocalStorage cache not configured in musora content services initializeService.');
        }
    }

    shouldVerifyServerVerions() {
        let lastUpdated = cache.getItem(this.localStorageLastUpdatedKey);
        if (!lastUpdated) return false;
        const verifyServerTime = 10000; //10 s
        return (new Date().getTime() - lastUpdated) > verifyServerTime;
    }

    clearCache() {
        this.clearContext();
        cache.removeItem(this.localStorageKey);
        cache.removeItem(this.localStorageLastUpdatedKey);
    }

    clearContext() {
        this.context = null;
    }

    async update(localUpdateFunction, serverUpdateFunction) {
        this.ensureLocalContextLoaded();
        if (this.context) {
            localUpdateFunction(this.context);
            this.context.version++;
            let data = JSON.stringify(this.context);
            cache.setItem(this.localStorageKey, data);
            cache.setItem(this.localStorageLastUpdatedKey, new Date().getTime());
        }
        let response = await serverUpdateFunction();
        if (response.version !== this.version()) {
            this.clearCache();
        }
    }

    version() {
        return this.context?.version ?? -1;
    }

}
