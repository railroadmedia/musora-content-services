

export class FilterBuilder {

    constructor({
                    user = undefined,
                    availableContentStatuses = [],
                    bypassPermissions = false,
                    pullFutureContent = false,
                    getFutureContentOnly = false,
                    getFollowedContentOnly = false,
                    getFutureScheduledContentsOnly = false,
                }) {
        this.user = user;
        this.availableContentStatuses = availableContentStatuses;
        this.bypassPermissions = bypassPermissions;
        this.pullFutureContent = pullFutureContent;
        this.getFutureContentOnly = getFutureContentOnly;
        this.getFollowedContentOnly = getFollowedContentOnly;
        this.getFutureScheduledContentsOnly = getFutureScheduledContentsOnly;
        this.filter = '';
    }


    static withOnlyFilterAvailableStatuses(availableContentStatuses) {
        return new FilterBuilder( {
                                availableContentStatuses,
                                });
    }

    buildFilter(baseFilter = '') {
        this.filter = baseFilter;
        return this._applyContentStatuses()
            ._applyPermissions()
            ._trimAmpersands()
            .filter;
    }

    _applyContentStatuses() {
        const leadingAmpersand = this.filter ? ' &&' : '';
        if (this.availableContentStatuses) {
            this.filter += `${leadingAmpersand} status in [${FilterBuilder.arrayJoinWithQuotes(this.availableContentStatuses)}]`
        }
        return this;
    }

    _applyPermissions() {
        if (this.bypassPermissions) return this;
        // do the thing;
    }

    _applyPublishingDateRestrictions() {
        // handle the combination of:
        this.pullFutureContent;
        this.getFutureScheduledContentsOnly;
        this.getFutureScheduledContentsOnly;
    }

    _trimAmpersands() {
        this.filter = this.filter.trim();
        while( this.filter.charAt(0) === '&' ) this.filter = this.filter.substring(1);
        while( this.filter.charAt(this.filter.length) === '&' ) this.filter = this.filter.slice(-1);
        return this;
    }

    static arrayJoinWithQuotes(array, delimiter = ',') {
        const wrapped = array.map(value => `'${value}'`);
        return wrapped.join(delimiter)
    }
}