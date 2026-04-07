import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import {
  varchar,
  uint32,
  nullableUint16,
  nullableUint32,
  nullableVarchar,
} from '../errors/validators'

export enum ACTIVITY_TAB {
  ALL = 'all',
  LESSONS = 'lesson',
  SONGS = 'song',
  POSTS = 'post',
  COMMENTS = 'comment',
}

export enum ACTIVITY_TYPE {
  STARTED = 'start',
  COMPLETED = 'complete',
  PLAY = 'play',
}

const validators = {
  content_id: nullableUint32,
  action: varchar(50),
  brand: varchar(50),
  type: varchar(50),
  date: uint32,
  summary: nullableVarchar(65535),
  post_id: nullableUint32,
  comment_id: nullableUint16,
}

export default class UserActivity extends BaseModel {
  static table = SYNC_TABLES.USER_ACTIVITIES

  get content_id() {
    return this._getRaw('content_id') as number | null
  }
  get action() {
    return this._getRaw('action') as string
  }
  get brand() {
    return this._getRaw('brand') as string
  }
  get type() {
    return this._getRaw('type') as string
  }
  get date() {
    return this._getRaw('date') as number
  }
  get summary() {
    return this._getRaw('summary') as string | null
  }
  get post_id() {
    return this._getRaw('post_id') as number | null
  }
  get comment_id() {
    return this._getRaw('comment_id') as number | null
  }

  set content_id(value: number | null) {
    this._setRaw('content_id', validators.content_id(value))
  }
  set action(value: string) {
    this._setRaw('action', validators.action(value))
  }
  set brand(value: string) {
    this._setRaw('brand', validators.brand(value))
  }
  set type(value: string) {
    this._setRaw('type', validators.type(value))
  }
  set date(value: number) {
    this._setRaw('date', validators.date(value))
  }
  set summary(value: string | null) {
    this._setRaw('summary', validators.summary(value))
  }
  set post_id(value: number | null) {
    this._setRaw('post_id', validators.post_id(value))
  }
  set comment_id(value: number | null) {
    this._setRaw('comment_id', validators.comment_id(value))
  }
}
