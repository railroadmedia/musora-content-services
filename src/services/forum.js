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
        title: 'My Journey with Pianote',
        post: "Hey everyone, I thought I'd create this topic to detail my journey with Pianote. I started playing piano for the first time on Friday the 10th of March",
        author: {
          id: 123,
          name: 'John Doe',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 12,
        url: 'https://forum.example.com/post/12',
        title: 'Learning the Piano',
        post: "I can't wait to share the ups and downs of learning the piano!",
        author: {
          id: 124,
          name: 'Jane Smith',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 13,
        url: 'https://forum.example.com/post/13',
        title: 'Piano Inspirations',
        post: "One video that got me so psyched to learn the piano was this guy on YouTube called chocotiger who played George winstons - variations on pachabel.",
        author: {
          id: 125,
          name: 'Alice Johnson',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 14,
        url: 'https://forum.example.com/post/14',
        title: 'Feedback on Lessons',
        post: "I appreciate the way the lessons are structured and how fun they are. To newbies like me (and maybe some others), would be great if there was a plug-in (like the one from flowkey) to plug your piano/keyboard and get realtime feedback. I'm also trying to learn how to read the sheet music, and it is sometimes hard to read what key is being played, so having the plug-in would help provide feedback asap instead of rewinding the video, (the fonts on the video are too small)",
        author: {
          id: 126,
          name: 'Bob Williams',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      }
    ]
  };

  return {
    data: results.entity,
    meta: {}
  };
}
