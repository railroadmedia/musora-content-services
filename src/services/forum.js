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
        post: "<p><strong>Lorem ipsum</strong> dolor sit amet, <em>consectetur adipiscing elit</em>. <a href='#'>Click here</a> for more info.</p>",
        author: {
          id: 123,
          name: 'John Doe',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 12,
        url: 'https://forum.example.com/post/12',
        post: "<p>This is a <span style='color: red;'>sample forum post</span> to <strong>test</strong> data structure. <ul><li>Point 1</li><li>Point 2</li></ul></p>",
        author: {
          id: 124,
          name: 'Jane Smith',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 13,
        url: 'https://forum.example.com/post/13',
        post: "<blockquote>Another test post with some <i>dummy text</i> content.</blockquote>",
        author: {
          id: 125,
          name: 'Alice Johnson',
          avatar: 'https://d3fzm1tzeyr5n3.cloudfront.net/profile_picture_url/5f6abe99-f1ed-49ec-aff4-893c017ed1aa-1681577292-565638.jpg'
        }
      },
      {
        id: 14,
        url: 'https://forum.example.com/post/14',
        post: "<h2>Final example post</h2><p>To complete the dataset, here is a <strong>bold</strong> statement and an image: <img src='https://example.com/image.jpg' alt='Example Image'></p>",
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
