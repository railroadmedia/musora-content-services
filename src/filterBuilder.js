

export class FilterBuilder {

    STATUS_SCHEDULED = 'scheduled';

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
            ._applyPublishingDateRestrictions()
            ._applyFollowedContentOnly()
            ._trimAmpersands() // just in case
            .filter;
    }

    _applyContentStatuses() {
        if (!this.availableContentStatuses) return this;
        if (this.getFutureScheduledContentsOnly && this.availableContentStatuses.includes(this.STATUS_SCHEDULED)) {
            const now = new Date().toISOString();
            let statuses = this.availableContentStatuses.splice(this.availableContentStatuses.indexOf(this.STATUS_SCHEDULED));
            this._andWhere(`(status in ${FilterBuilder.arrayToStringRepresentation(statuses)}] OR (status == ${this.STATUS_SCHEDULED}) && published_on >= ${now})`)
        } else {
            this._andWhere(`status in ${FilterBuilder.arrayToStringRepresentation(this.availableContentStatuses)}`);
        }
        return this;
    }

    _applyPermissions() {
        if (this.bypassPermissions) return this;
        const hardcodedPermissions = ["my-permission-1","my-permission-2"]; //todo switch these to railcontent_ids
        // todo these need to be pulled from the user and reference either ID, or railcontent_id
        const requiredPermissions = hardcodedPermissions;
        // handle pullSongsContent, I think the flagging on this needs to be backwards compared to BE
        // if using id, switch railcontent_id to _id in the below query
        this._andWhere(`references(*[_type == "permission" && railcontent_id in ${FilterBuilder.arrayToStringRepresentation(requiredPermissions)}._id`);
        return this;

    }

    _applyFollowedContentOnly() {
        if (!this.getFollowedContentOnly) return this;
        // todo getfollowedContentFromUser
        const followedContentIds = [];
        this._andWhere(`railcontent_id in ${FilterBuilder.arrayToStringRepresentation(followedContentIds)}`);
        return this;
    }


    _applyPublishingDateRestrictions() {
        const now = new Date().toISOString();
        if (this.getFutureContentOnly) {
            this._andWhere(`published_on >= ${now}`);
        } else if (!this.pullFutureContent) {
            this._andWhere(`published_on <= ${now}`);
        } else {
            const date = new Date();
            const theFuture =  new Date(date.setMonth(date.getMonth() + 18));
            this._andWhere(`published_on <= ${theFuture}`);
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
        while( this.filter.charAt(0) === '&' ) this.filter = this.filter.substring(1);
        while( this.filter.charAt(this.filter.length) === '&' ) this.filter = this.filter.slice(-1);
        return this;
    }

    static arrayToStringRepresentation(arr) {
        return '[' + arr.map(item => `"${item}"`).join(',') + ']';
    }
}