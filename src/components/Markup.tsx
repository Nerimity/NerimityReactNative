import {
  addTextSpans,
  Entity,
  parseMarkup,
  Span,
  UnreachableCaseError,
} from '@nerimity/nevula';
import { RawMessage, RawUser } from '../RawData';
import React, {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextLayoutEvent,
  View,
} from 'react-native';
import { Avatar } from './Avatar';
import * as MeasureText from '@domir/react-native-measure-text/src/ReactNativeMeasureText';

export interface MarkupProps {
  text: string;
  message?: RawMessage;
}

interface MarkupContext {
  props: MarkupProps;
  emojiCount: number;
  textCount: number;
  quoteCount: number;
}

const transformEntities = (entity: Entity, ctx: MarkupContext) =>
  entity.entities.map(e => {
    const element = transformEntity(e, ctx);
    return {
      ...element,
      key: `${e.type}-${e.outerSpan.start}`,
    };
  });

const sliceText = (
  ctx: MarkupContext,
  span: Span,
  { countText = true } = {},
) => {
  const text = ctx.props.text.slice(span.start, span.end);
  if (countText && !/^\s+$/.test(text)) {
    ctx.textCount += text.length;
  }
  return text;
};

type CustomEntity = Entity & { type: 'custom' };

function transformCustomEntity(entity: CustomEntity, ctx: MarkupContext) {
  const type = entity.params.type;
  const expr = sliceText(ctx, entity.innerSpan, { countText: false });

  switch (type) {
    case '@': {
      const message = ctx.props.message;
      const user = message?.mentions?.find(u => u.id === expr);
      ctx.textCount += expr.length;
      return <Mention user={user!} />;
    }
    default: {
      return <Text style={{ color: 'red' }}>{entity.type}</Text>;
      // throw new UnreachableCaseError(entity as never);
    }
  }
}

const Mention = (props: { user: RawUser }) => {
  const [width, setWidth] = useState(0);
  const targetRef = React.useRef(null);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'blue',
        width: width + 10,
      }}
    >
      <Avatar user={props.user} size={10} />
      <Text>{props.user.username}</Text>
      <Text
        onTextLayout={e => setWidth(e.nativeEvent.lines[0].width)}
        style={{ color: 'red', position: 'absolute', opacity: 0 }}
        ref={targetRef}
      >
        {props.user.username}
      </Text>
    </View>
  );
};

function transformEntity(entity: Entity, ctx: MarkupContext): ReactElement {
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
      return <Text style={{ color: 'red' }}>{entity.type}</Text>;
      // throw new UnreachableCaseError(entity as never);
    }
  }
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
  },
});

export function Markup(props: MarkupProps) {
  const output = useMemo(() => {
    const ctx: MarkupContext = {
      props,
      emojiCount: 0,
      textCount: 0,
      quoteCount: 0,
    };

    const entity = addTextSpans(parseMarkup(props.text));
    return transformEntity(entity, ctx);
  }, [props]);

  return <Text>{output}</Text>;
}
