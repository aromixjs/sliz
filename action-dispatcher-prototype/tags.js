export class PostCard {
  constructor(props) {
    this.postId = props.postId;
    this.title = props.title;
    this.onLike = props.onLike; 
    this.likes = 0; 
  }

  static __meta = {
    actions: {
      like: {
        reads: ['likes', 'postId'],
        calls: { prop: 'onLike', args: ['postId'] }
      }
    }
  };

  like() {
    this.likes++;
    if (this.onLike) this.onLike(this.postId);
  }

  render() {
    return {
      tag: 'div',
      style: 'border:1px solid #ccc; padding:10px; margin:5px;',
      children: [
        { tag: 'h3', children: [this.title] },
        { tag: 'p', bind: 'likes', children: [`${this.likes} Likes`] },
        { tag: 'button', onClick: 'like', children: ['👍 Like'] }
      ]
    };
  }
}

export class Feed {
  constructor() {
    this.totalLikes = 0;
    this.posts = [{ id: 1, title: 'Aromix is rad' }, { id: 2, title: 'No more RPCs' }];
  }

  static __meta = {
    actions: {
      registerLike: {
        reads: ['totalLikes']
      }
    }
  };

  registerLike(id) {
    this.totalLikes++;
  }

  render() {
    return {
      tag: 'div',
      children: [
        { tag: 'h2', children: ['Total Feed Likes: '] },
        { tag: 'span', bind: 'totalLikes', style: 'color:blue; font-weight:bold;', children: [`${this.totalLikes}`] },
        ...this.posts.map(p => ({
          tag: PostCard,
          props: { postId: p.id, title: p.title, onLike: this.registerLike }
        }))
      ]
    };
  }
}