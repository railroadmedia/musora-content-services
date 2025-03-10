/**
 * @module User-Activity
 */

import {fetchHandler} from "./railcontent";
const dummyData = {
  userActivityStats: {
    user: {
      id: 1,
      fullName: 'John Doe',
      profilePictureUrl: 'https://i.pravatar.cc/300',
    },
    dailyActiveStats: [
      { label: 'M', isActive: false, inStreak: false, type: 'none' },
      { label: 'T', isActive: false, inStreak: false, type: 'none' },
      { label: 'W', isActive: true, inStreak: true, type: 'tracked' },
      { label: 'T', isActive: true, inStreak: true,  type: 'tracked' },
      { label: 'F', isActive: false, inStreak: false,  type: 'none' },
      { label: 'S', isActive: true, inStreak: false,  type: 'active' },
      { label: 'S', isActive: false, inStreak: false, type: 'none' }
    ],
  },
  currentDailyStreak: 3,
  currentWeeklyStreak: 2,
  activityMessage: "That's 8 weeks in a row! Way to keep your streak going.",
};

export async function getUserActivityStats(userId) {
  return dummyData;
  //return await fetchHandler(`/api/user-activity/v1/stats`);
}



