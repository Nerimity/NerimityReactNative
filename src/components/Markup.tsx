import React from 'react';
import {Message} from '../store/messages';
import {Text, StyleSheet, View} from 'react-native';
import {
  parseMarkup,
  addTextSpans,
  Entity,
  Span,
  UnreachableCaseError,
} from '@nerimity/nevula';
import {store} from '../store/store';
import {User} from '../store/users';
import Avatar from './ui/Avatar';
import Colors from './ui/Colors';

interface MarkupProps {
  text: string;
  largeEmoji?: boolean;
  message?: Message;
  inline?: boolean;
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

function transformCustomEntity(entity: CustomEntity, ctx: RenderContext) {
  const type = entity.params.type;
  const expr = sliceText(ctx, entity.innerSpan, {countText: false});
  switch (type) {
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

function transformEntity(entity: Entity, ctx: any) {
  switch (entity.type) {
    case 'text': {
      if (entity.entities.length > 0) {
        return <Text>{transformEntities(entity, ctx)}</Text>;
      } else {
        return <Text>{sliceText(ctx, entity.innerSpan)}</Text>;
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
    case 'custom': {
      return transformCustomEntity(entity, ctx);
    }
    default: {
      return <Text>{sliceText(ctx, entity.innerSpan)}</Text>;
    }
  }
}

function MentionUser(props: {user: User}) {
  return (
    <View style={styles.mention}>
      <View style={{width: 2}} />
      {/* <Avatar user={props.user} size={12} /> */}
      <Text style={styles.mentionText}>{props.user.username}</Text>
      <View style={{width: 2}} />
    </View>
  );
}

export default function Markup(props: MarkupProps) {
  const ctx = {props, emojiCount: 0, textCount: 0};
  const entity = addTextSpans(parseMarkup(ctx.props.text));
  const output = transformEntity(entity, ctx);

  return <Text style={{lineHeight: 50}}>{output}</Text>;
}

const styles = StyleSheet.create({
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
    height: 30,
  },
  mentionText: {
    color: Colors.primaryColor,
    fontSize: 12,
    // lineHeight: 12 * 2,
  },
});
