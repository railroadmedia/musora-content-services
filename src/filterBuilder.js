import {fetchUserPermissions} from "./services/userPermissions";


export class FilterBuilder {

    STATUS_SCHEDULED = 'scheduled';

    constructor(
        filter = '',
        {
            availableContentStatuses = [],
            bypassPermissions = false,
            pullFutureContent = false,
            getFutureContentOnly = false,
            getFutureScheduledContentsOnly = false,

        } = {}) {
        this.availableContentStatuses = availableContentStatuses;
        this.bypassPermissions = bypassPermissions;
        this.pullFutureContent = pullFutureContent;
        this.getFutureContentOnly = getFutureContentOnly;
        this.getFutureScheduledContentsOnly = getFutureScheduledContentsOnly;
        this.filter = filter;
        // this.debug = process.env.DEBUG === 'true' || false;
        this.debug = false;
    }


    static withOnlyFilterAvailableStatuses(filter, availableContentStatuses, bypassPermissions) {
        return new FilterBuilder(filter, {
            availableContentStatuses,
            bypassPermissions,
        });
    }

    async buildFilter() {
        this.userData = await fetchUserPermissions();
        if (this.debug) console.log('baseFilter', this.filter);
        const filter = this
            ._applyContentStatuses()
            ._applyPermissions()
            ._applyPublishingDateRestrictions()
            ._trimAmpersands() // just in case
            .filter;
        if (this.debug) console.log('finalFilter', filter);
        return filter;
    }

    _applyContentStatuses() {
        // This must be run before _applyPublishDateRestrictions()
        if (this.availableContentStatuses.length === 0) return this;
        // I'm not sure if I'm 100% on this logic, but this is my intepretation of the ContentRepository logic
        if (this.getFutureScheduledContentsOnly && this.availableContentStatuses.includes(this.STATUS_SCHEDULED)) {
            // we must pull in future content here, otherwise we'll restrict on content this is published in the past and remove any scheduled content
            this.pullFutureContent = true;
            const now = new Date().toISOString();
            let statuses = [...this.availableContentStatuses];
            statuses.splice(statuses.indexOf(this.STATUS_SCHEDULED));
            this._andWhere(`(status in ${arrayToStringRepresentation(statuses)} || (status == '${this.STATUS_SCHEDULED}' && published_on >= '${now}'))`)

        } else {
            this._andWhere(`status in ${arrayToStringRepresentation(this.availableContentStatuses)}`);
        }
        return this;
    }

    _applyPermissions() {
        if (this.bypassPermissions || this.userData.isAdmin) return this;
        const requiredPermissions = this._getUserPermissions();
        if (requiredPermissions.length === 0) return this;
        this._andWhere(`references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(requiredPermissions)}]._id)`);
        return this;
    }

    _getUserPermissions() {
        return this.userData.permissions;
    }

    _applyPublishingDateRestrictions() {
        const now = new Date().toISOString();
        if (this.getFutureContentOnly) {
            this._andWhere(`published_on >= '${now}'`);
        } else if (!this.pullFutureContent) {
            this._andWhere(`published_on <= '${now}'`);
        } else {
            const date = new Date();
            const theFuture = new Date(date.setMonth(date.getMonth() + 18));
            this._andWhere(`published_on <= '${theFuture}'`);
        }
        return this;
    }

    _andWhere(query) {
        const leadingAmpersand = this.filter ? ' && ' : '';
        this.filter += leadingAmpersand + query;
    }

    _orWhere(query) {
        if (!this.filter) throw new Error("invalid query, _orWhere needs to be called on an existing query");
        this.filter += ` || (${query})`;
    }

    _trimAmpersands() {
        this.filter = this.filter.trim();
        while (this.filter.charAt(0) === '&' || this.filter.charAt(0) === ' ') this.filter = this.filter.substring(1);
        while (this.filter.charAt(this.filter.length) === '&' || this.filter.charAt(this.filter.length) === ' ') this.filter = this.filter.slice(-1);
        return this;
    }


}

export function arrayToStringRepresentation(arr) {
    return '[' + arr.map(item => `'${item}'`).join(',') + ']';
}

export function arrayToRawRepresentation(arr) {
    return '[' + arr.map(item => `${item}`).join(',') + ']';
}