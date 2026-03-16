import {
  addTextSpans,
  Entity,
  parseMarkup,
  Span,
  UnreachableCaseError,
} from '@nerimity/nevula';
import { RawMessage } from '../RawData';
import { ReactElement, useMemo } from 'react';
import { Text } from 'react-native';

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

function transformEntity(entity: Entity, ctx: MarkupContext): ReactElement {
  switch (entity.type) {
    case 'text': {
      if (entity.entities.length > 0) {
        return <Text>{transformEntities(entity, ctx)}</Text>;
      } else {
        return <Text>{sliceText(ctx, entity.innerSpan)}</Text>;
      }
    }
    case 'bold': {
      return (
        <Text style={{ fontWeight: 'bold' }}>
          {transformEntities(entity, ctx)}
        </Text>
      );
    }
    default: {
      throw new UnreachableCaseError(entity as never);
    }
  }
}

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
