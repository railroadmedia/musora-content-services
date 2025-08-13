/**
 * @module Forum-V2
 */


export async function getActiveDiscussions(brand, { page = 1, limit = 10 } = {}) {
  // Dummy data TODO: BE endpoint call
  const results = {
    entity: [
      {
        id: 11,
        url: 'https://forum.example.com/post/11',
        title: 'How to Progress.',
        post: "I use the 20-80 formula. 20% of the time on rudiments, skill, technique. 80% of the time working on songs or just playing along to the radio. Since it's a percentage, it fits any amount of time whether it's ten minutes or two hours. My neighbors would be p*ssed if I played two hours a day broken up over the whole day. They prefer I get my practice done in one shot. An hour a day works well for me.",
        author: {
          id: 123,
          name: 'Zucconi',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/BE9F40FC-61C8-48FB-BC79-6E5A7100638F-1710514476-612136.jpg'
        }
      },
      {
        id: 12,
        url: 'https://forum.example.com/post/12',
        title: 'Laptop Stand Suggestions?',
        post: "I got a cheap one from Amazon (39.43 Australian Dollars), very simple but I have had no problems with it. This is how I'm watching my Drumeo lessons :) It has some little holes in 2 corners so you could mount a phone holder to it also.",
        author: {
          id: 124,
          name: 'Abyssic Wizard',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/32F50623-BC25-429A-B480-B4A6A0E037D7-1748730048-844311.jpg'
        }
      },
      {
        id: 13,
        url: 'https://forum.example.com/post/13',
        title: 'Introduce yourself to the Drumeo Community...',
        post: "Hi drummer forum 1. I'm 67 and retired plus an adjunct professor at community college currently 2. Enjoying an Alesis with Nitro Max practice drum set and on 9th day going through Domino Santantonio's 30 day challenge. Domino is wonderful and energetic. 3. I like any kind of alt-rock, rock, old gaelic style drumming, and jazz drumming",
        author: {
          id: 125,
          name: 'Rwogie',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/user-profile-picture-1752520294-843602.jpg'
        }
      },
      {
        id: 14,
        url: 'https://forum.example.com/post/14',
        title: 'Musora Cross Collaboration June 2025',
        post: "Hey everyone! 🎉 Awesome news! We’ve officially extended the deadline to submit your “Hold The Line” video. You now have until July 1st, 2025 to send it in! We cannot wait to see you all crush this track. Seriously, this is going to be such a fun project, and we’re beyond stoked to showcase your playing. If you’ve got any questions (or just want to say hi), feel free to reach out at <a href=\"mailto:mentors@musora.com\">mentors@musora.com</a>. Let’s make this epic!",
        author: {
          id: 126,
          name: 'Ale',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/user-profile-picture-1728402676-577074.jpg'
        }
      },
      {
        id: 15,
        url: 'https://forum.example.com/post/15',
        title: 'Drum Recording & Mixing Questions',
        post: "Hi, thanks for welcoming me to Drumeo! I've seen a lot of great acoustic drum performances in your videos – the sound quality is amazing. I'm curious: How do you record your drums to get such a professional sound?",
        author: {
          id: 127,
          name: 'Peter Neumann',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/user-profile-picture-1725633212-597725.jpg'
        }
      },
      {
        id: 16,
        url: 'https://forum.example.com/post/16',
        title: 'Play Along or Background Music',
        post: "Hey Aali, you can use the play along tracks (in the sidebar menu) or the songs in the song section to practice with. You can also use your own music via your phone etc to play along with. When I started playing we never had online lessons so I used to practice with CDs etc. Youtube is another option as others have said. From the lessons, many have tracks you can practice along to in the \"Resources\" tab to download",
        author: {
          id: 128,
          name: 'Stidger (Musora Mod)',
          avatar: 'https://www.musora.com/cdn-cgi/image/quality=75,width=250,height=250,metadata=none/https://dzryyo1we6bm3.cloudfront.net/avatars/6A09AFCB-B242-4278-A8B3-0013A650206A-1644690552-495979.jpg'
        }
      }
    ]
  };

  return {
    data: results.entity,
    meta: {}
  };
}
