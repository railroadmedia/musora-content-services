import { fetchUserPermissions } from './services/userPermissions.js'
import { songAccessMembership } from './contentTypeConfig.js'

export class FilterBuilder {
  STATUS_SCHEDULED = 'scheduled'
  STATUS_PUBLISHED = 'published'
  STATUS_DRAFT = 'draft'
  STATUS_ARCHIVED = 'archived'
  STATUS_UNLISTED = 'unlisted'

    constructor(
        filter = '',
        {
            availableContentStatuses = [],
            bypassPermissions = false,
            pullFutureContent = false,
            getFutureContentOnly = false,
            getFutureScheduledContentsOnly = false,
            bypassStatuses = false,
            bypassPublishedDateRestriction = false,
            isSingle = false,
            allowsPullSongsContent = true,
            isChildrenFilter = false,
            checkNullPublished = false
        } = {}) {
        this.availableContentStatuses = availableContentStatuses
        this.bypassPermissions = bypassPermissions
        this.bypassStatuses = bypassStatuses
        this.bypassPublishedDateRestriction = bypassPublishedDateRestriction
        this.pullFutureContent = pullFutureContent
        this.getFutureContentOnly = getFutureContentOnly
        this.getFutureScheduledContentsOnly = getFutureScheduledContentsOnly
        this.isSingle = isSingle
        this.allowsPullSongsContent = allowsPullSongsContent
        this.filter = filter
        // this.debug = process.env.DEBUG === 'true' || false;
        this.debug = false
        this.prefix =  isChildrenFilter ? '@->' : ''
        this.checkNullPublished = checkNullPublished
    }

  constructor(
    filter = '',
    {
      availableContentStatuses = [],
      bypassPermissions = false,
      pullFutureContent = false,
      getFutureContentOnly = false,
      getFutureScheduledContentsOnly = false,
      bypassStatuses = false,
      bypassPublishedDateRestriction = false,
      isSingle = false,
      allowsPullSongsContent = true,
      isChildrenFilter = false,
    } = {}
  ) {
    this.availableContentStatuses = availableContentStatuses
    this.bypassPermissions = bypassPermissions
    this.bypassStatuses = bypassStatuses
    this.bypassPublishedDateRestriction = bypassPublishedDateRestriction
    this.pullFutureContent = pullFutureContent
    this.getFutureContentOnly = getFutureContentOnly
    this.getFutureScheduledContentsOnly = getFutureScheduledContentsOnly
    this.isSingle = isSingle
    this.allowsPullSongsContent = allowsPullSongsContent
    this.filter = filter
    // this.debug = process.env.DEBUG === 'true' || false;
    this.debug = false
    this.prefix = isChildrenFilter ? '@->' : ''
  }

  static withOnlyFilterAvailableStatuses(filter, availableContentStatuses, bypassPermissions) {
    return new FilterBuilder(filter, {
      availableContentStatuses,
      bypassPermissions,
    })
  }

  async buildFilter() {
    this.userData = await fetchUserPermissions()
    if (this.debug) console.log('baseFilter', this.filter)
    const filter = this._applyContentStatuses()
      ._applyPermissions()
      ._applyPublishingDateRestrictions()
      ._trimAmpersands().filter // just in case
    if (this.debug) console.log('finalFilter', filter)
    return filter
  }

  _applyContentStatuses() {
    // This must be run before _applyPublishDateRestrictions()
    if (this.bypassStatuses) return this
    if (this.availableContentStatuses.length === 0) {
      if (this.userData.isAdmin) {
        this.availableContentStatuses = [
          this.STATUS_DRAFT,
          this.STATUS_SCHEDULED,
          this.STATUS_PUBLISHED,
          this.STATUS_ARCHIVED,
          this.STATUS_UNLISTED,
        ]
        this.getFutureScheduledContentsOnly = true
      } else if (this.isSingle) {
        this.availableContentStatuses = [
          this.STATUS_SCHEDULED,
          this.STATUS_PUBLISHED,
          this.STATUS_UNLISTED,
          this.STATUS_ARCHIVED,
        ]
      } else {
        this.availableContentStatuses = [this.STATUS_SCHEDULED, this.STATUS_PUBLISHED]
        this.getFutureScheduledContentsOnly = true
      }
    }

    // I'm not sure if I'm 100% on this logic, but this is my intepretation of the ContentRepository logic
    if (
      this.getFutureScheduledContentsOnly &&
      this.availableContentStatuses.includes(this.STATUS_SCHEDULED)
    ) {
      // we must pull in future content here, otherwise we'll restrict on content this is published in the past and remove any scheduled content
      this.pullFutureContent = true
      const now = new Date().toISOString()
      let statuses = [...this.availableContentStatuses]
      statuses.splice(statuses.indexOf(this.STATUS_SCHEDULED), 1)
      this._andWhere(
        `(${this.prefix}status in ${arrayToStringRepresentation(statuses)} || (${this.prefix}status == '${this.STATUS_SCHEDULED}' && defined(${this.prefix}published_on) && ${this.prefix}published_on >= '${now}'))`
      )
    } else {
      this._andWhere(
        `${this.prefix}status in ${arrayToStringRepresentation(this.availableContentStatuses)}`
      )
    }
    return this
  }

  _applyPermissions() {
    if (this.bypassPermissions || this.userData.isAdmin) return this
    let requiredPermissions = this._getUserPermissions()
    if (this.userData.isABasicMember && this.allowsPullSongsContent) {
      requiredPermissions = [...requiredPermissions, songAccessMembership]
    }
    this._andWhere(
      `(!defined(permission) || references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(requiredPermissions)}]._id))`
    )
    return this
  }

  _getUserPermissions() {
    return this.userData.permissions
  }

  _applyPublishingDateRestrictions() {
    if (this.bypassPublishedDateRestriction) return this
    let now = new Date()

    // We need to set the published on filter date to be a round time so that it doesn't bypass the query cache
    // with every request by changing the filter date every second. I've set it to one minute past the current hour
    // because publishing usually publishes content on the hour exactly which means it should still skip the cache
    // when the new content is available.
    // Round to the start of the current hour
    const roundedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())

    now = roundedDate.toISOString()

        if (this.checkNullPublished) {
            this._andWhere(`(published_on >='${now}'`)
            this._orWhere(`published_on == null)`)
        } else if (this.getFutureContentOnly) {
            this._andWhere(`${this.prefix}published_on >= '${now}'`)
        } else if (!this.pullFutureContent) {
            this._andWhere(`${this.prefix}published_on <= '${now}'`)
        } else {
            // const date = new Date();
            // const theFuture = new Date(date.setMonth(date.getMonth() + 18));
            // this._andWhere(`published_on <= '${theFuture}'`);
        }

        return this
    }
    //if


  _andWhere(query) {
    const leadingAmpersand = this.filter ? ' && ' : ''
    this.filter += leadingAmpersand + query
  }

  _orWhere(query) {
    if (!this.filter)
      throw new Error('invalid query, _orWhere needs to be called on an existing query')
    this.filter += ` || (${query})`
  }

  _trimAmpersands() {
    this.filter = this.filter.trim()
    while (this.filter.charAt(0) === '&' || this.filter.charAt(0) === ' ')
      this.filter = this.filter.substring(1)
    while (
      this.filter.charAt(this.filter.length) === '&' ||
      this.filter.charAt(this.filter.length) === ' '
    )
      this.filter = this.filter.slice(-1)
    return this
  }
}

export function arrayToStringRepresentation(arr) {
  return '[' + arr.map((item) => `'${item}'`).join(',') + ']'
}

export function arrayToRawRepresentation(arr) {
  return '[' + arr.map((item) => `${item}`).join(',') + ']'
}
