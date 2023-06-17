import React, {createElement, useEffect, useState} from 'react';
import {Message} from '../store/messages';
import {Text, StyleSheet, View, Linking} from 'react-native';
import {parseMarkup, addTextSpans, Entity, Span} from '@nerimity/nevula';
import {store} from '../store/store';
import {User} from '../store/users';
import Avatar from './ui/Avatar';
import Colors from './ui/Colors';
import {RawUser} from '../store/RawData';
import {Channel} from '../store/channels';
import {
  emojiShortcodeToUnicode,
  emojiUnicodeToShortcode,
  unicodeToTwemojiUrl,
} from '../utils/emoji/emoji';

import FastImage from 'react-native-fast-image';
import env from '../utils/env';

interface MarkupProps {
  text: string;
  largeEmoji?: boolean;
  message?: Message;
  inline?: boolean;
  isQuote?: boolean;
  afterComponent?: React.JSX.Element;
}

type RenderContext = {
  props: MarkupProps;
  textCount: number;
  emojiCount: number;
};

const transformEntities = (entity: Entity, ctx: RenderContext) =>
  entity.entities.map(e => transformEntity(e, ctx));

const sliceText = (ctx: any, span: Span, {countText = true} = {}) => {
  const text = ctx.props.text.slice(span.start, span.end);
  if (countText && !/^\s+$/.test(text)) {
    ctx.textCount += text.length;
  }
  return text;
};

type CustomEntity = Entity & {type: 'custom'};
function transformCustomEntity(entity: CustomEntity, ctx: RenderContext) {
  const type = entity.params.type;
  const expr = sliceText(ctx, entity.innerSpan, {countText: false});
  switch (type) {
    case '#': {
      const channel = store.channels.get(expr);
      if (channel?.serverId) {
        ctx.textCount += expr.length;
        return <MentionChannel channel={channel} />;
      }
      break;
    }
    case '@': {
      const message = ctx.props.message;
      const user =
        message?.mentions?.find(u => u.id === expr) || store.users.get(expr);
      if (user) {
        ctx.textCount += expr.length;
        return <MentionUser user={user} />;
      }
      break;
    }
    case 'q': {
      // // quoted messages
      // if (ctx.props.isQuote) {
      //   return <QuoteMessageHidden />;
      // }
      const quote = ctx.props.message?.quotedMessages?.find(m => m.id === expr);

      if (quote) {
        return <QuoteMessage message={ctx.props.message} quote={quote} />;
      }
      return <Text>Invalid HANDLE ME</Text>;

      // return <QuoteMessageInvalid />;
    }
    case 'ace': // animated custom emoji
    case 'ce': {
      // custom emoji
      const [id, name] = expr.split(':');
      ctx.emojiCount += 1;
      const animated = type === 'ace';
      return (
        <Emoji
          {...{
            animated,
            name,
            url: `${env.NERIMITY_CDN}emojis/${id}${
              animated ? '.gif' : '.webp'
            }`,
          }}
        />
      );
    }
    // case 'link': {
    //   const [url, text] = expr.split('->').map(s => s.trim());

    //   if (url && text) {
    //     ctx.textCount += text.length;
    //     return <Link {...{url, text}} />;
    //   }
    //   break;
    // }
    default: {
      console.warn('Unknown custom entity:', type);
    }
  }
  return <Text>{sliceText(ctx, entity.outerSpan)}</Text>;
}

function transformEntity(entity: Entity, ctx: any): JSX.Element {
  switch (entity.type) {
    case 'text': {
      if (entity.entities.length > 0) {
        return <Text>{transformEntities(entity, ctx)}</Text>;
      } else {
        return <Text>{sliceText(ctx, entity.innerSpan)}</Text>;
      }
    }
    case 'link': {
      const url = sliceText(ctx, entity.innerSpan);
      return <Link {...{url}} />;
    }
    case 'color': {
      const {color} = entity.params;
      const lastCount = ctx.textCount;
      let el: any;

      if (color.startsWith('#')) {
        el = <Text style={{color}}>{transformEntities(entity, ctx)}</Text>;
      } else {
        el = transformEntities(entity, ctx);
      }

      if (lastCount !== ctx.textCount) {
        return el;
      } else {
        return sliceText(ctx, entity.outerSpan);
      }
    }

    case 'bold':
    case 'italic':
    case 'underline':
    case 'strikethrough': {
      // todo: style folding when there's no before/after for dom memory usage optimization
      // if(beforeSpan.start === beforeSpan.end && afterSpan.start === afterSpan.end) {}
      // class={entity.type}
      return (
        <Text style={styles[entity.type]}>
          {transformEntities(entity, ctx)}
        </Text>
      );
    }
    case 'emoji_name': {
      const name = sliceText(ctx, entity.innerSpan, {countText: false});
      const unicode = emojiShortcodeToUnicode(name as unknown as string);
      if (!unicode) {
        return sliceText(ctx, entity.outerSpan);
      }
      ctx.emojiCount += 1;
      return <Emoji name={name} url={unicodeToTwemojiUrl(unicode)} />;
    }
    case 'emoji': {
      const emoji = sliceText(ctx, entity.innerSpan, {countText: false});
      ctx.emojiCount += 1;
      return (
        <Emoji
          name={emojiUnicodeToShortcode(emoji)}
          url={unicodeToTwemojiUrl(emoji)}
        />
      );
    }
    case 'custom': {
      return transformCustomEntity(entity, ctx);
    }
    default: {
      return <Text>{sliceText(ctx, entity.innerSpan)}</Text>;
    }
  }
}

function Link(props: {url: string}) {
  return (
    <Text onPress={() => Linking.openURL(props.url)} style={styles.link}>
      {props.url}
    </Text>
  );
}

function Emoji(props: {
  name: string;
  url: string;
  large?: boolean;
  inline?: boolean;
}) {
  return (
    <FastImage
      style={[
        styles.emoji,
        props.large && styles.largeEmoji,
        props.inline && styles.inlineEmoji,
      ]}
      source={{
        uri: props.url,
        priority: FastImage.priority.low,
      }}
    />
  );
}

function MentionChannel(props: {channel: Channel}) {
  return (
    <View style={styles.mention}>
      <Text style={styles.mentionChannelHash}>#</Text>
      <Text style={styles.mentionText}>{props.channel.name}</Text>
    </View>
  );
}

function MentionUser(props: {user: RawUser | User}) {
  return (
    <View style={styles.mention}>
      <Avatar user={props.user} size={16} />
      <Text style={styles.mentionText}>{props.user.username}</Text>
    </View>
  );
}

function QuoteMessage(props: {message: Message; quote: Partial<Message>}) {
  return (
    <View style={styles.quoteContainer}>
      <View style={styles.quoteDetailsContainer}>
        <Avatar user={props.quote.createdBy!} size={18} />
        <Text>{props.quote.createdBy?.username}</Text>
      </View>
      <View style={{flexWrap: 'wrap', flex: 1}}>
        <Markup text={props.quote.content || ''} isQuote />
      </View>
    </View>
  );
}

const MarkupOuter = (props: MarkupProps) => {
  const ctx = {props, emojiCount: 0, textCount: 0};
  const entity = addTextSpans(parseMarkup(ctx.props.text));
  const output = transformEntity(entity, ctx);

  let newOutput = [];
  const largeEmoji =
    !ctx.props.inline && ctx.emojiCount <= 5 && ctx.textCount === 0;

  const inlineEmoji = ctx.emojiCount && !ctx.textCount && props.inline;

  let el = createElement(Text, {style: {lineHeight: largeEmoji ? 43 : 18}}, []);

  if (Array.isArray(output.props.children)) {
    for (let i = 0; i < output.props.children.length; i++) {
      let element = output.props.children[i];
      if (element.type === QuoteMessage) {
        el.props.children?.length && newOutput.push(el);
        newOutput.push(element);
        el = createElement(Text, {}, []);
        continue;
      }

      if ((largeEmoji || inlineEmoji) && element.type === Emoji) {
        element = React.cloneElement(element, {
          large: largeEmoji,
          inline: !!inlineEmoji,
        });
      }
      el.props.children?.push(element);
    }
  } else {
    return (
      <View>
        <Text>
          {output}
          {props.afterComponent}
        </Text>
      </View>
    );
  }
  props.afterComponent && el.props.children?.push(props.afterComponent);
  el.props.children?.length && newOutput.push(el);

  return <View>{newOutput}</View>;
};

const Markup = (props: MarkupProps) => {
  const [test, setTest] = useState(0);

  const test2 = () => setTest(test + 1);
  useEffect(() => {
    test2();
    // This is done line this because editing emojis breaks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.text]);

  return <MarkupOuter {...props} key={test} />;
};

export default Markup;

const styles = StyleSheet.create({
  link: {
    color: Colors.primaryColor,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  mention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,.2)',
    borderRadius: 8,
    transform: [{translateY: 5}],
    padding: 3,
  },
  mentionText: {
    color: Colors.primaryColor,
    fontSize: 12,
  },
  mentionChannelHash: {
    color: Colors.primaryColor,
    opacity: 0.4,
    fontSize: 12,
  },
  emoji: {
    width: 20,
    height: 20,
    transform: [{translateY: 5}],
  },
  largeEmoji: {width: 50, height: 50, transform: [{translateY: 4}]},
  inlineEmoji: {transform: [{translateY: 1}]},
  quoteContainer: {
    borderLeftColor: Colors.primaryColor,
    borderLeftWidth: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
    padding: 6,
    marginTop: 5,
    marginBottom: 5,
  },
  quoteDetailsContainer: {
    flexDirection: 'row',
    gap: 5,
  },
});
