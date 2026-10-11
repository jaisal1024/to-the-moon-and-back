import { Typography } from '@mui/material';
import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical';
import { type JSXConvertersFunction, LinkJSXConverter, RichText } from '@payloadcms/richtext-lexical/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Post } from 'src/payload-types';

type CodeBlockFields = { blockType: 'Code'; language?: string | null; code?: string | null };
type NodeTypes = DefaultNodeTypes | SerializedBlockNode<CodeBlockFields>;

const linkClassName =
  'text-blue-600 underline decoration-blue-600/30 underline-offset-4 transition-colors hover:text-blue-800 hover:decoration-blue-800';

// Same typography and code styling the Sanity Portable Text renderer used.
const converters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({}),
  paragraph: ({ node, nodesToJSX }) => (
    <Typography variant="body1" className="leading-8">
      {nodesToJSX({ nodes: node.children })}
    </Typography>
  ),
  heading: ({ node, nodesToJSX }) => {
    const variant = node.tag === 'h2' ? 'h2' : 'h3';
    return (
      <Typography variant={variant} className={variant === 'h2' ? 'mt-8' : 'mt-6'}>
        {nodesToJSX({ nodes: node.children })}
      </Typography>
    );
  },
  link: ({ node, nodesToJSX }) => (
    <a
      href={node.fields.url ?? ''}
      className={linkClassName}
      target={node.fields.newTab ? '_blank' : undefined}
      rel={node.fields.newTab ? 'noopener noreferrer' : undefined}
    >
      {nodesToJSX({ nodes: node.children })}
    </a>
  ),
  blocks: {
    Code: ({ node }) => (
      <figure className="my-4 overflow-hidden rounded-2xl">
        <SyntaxHighlighter
          language={node.fields.language || 'typescript'}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '1.25rem', fontSize: '0.875rem', lineHeight: '1.5rem' }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
        >
          {node.fields.code ?? ''}
        </SyntaxHighlighter>
      </figure>
    ),
  },
});

export default function PostBody({ body }: { body: Post['body'] }) {
  return (
    <RichText
      data={body}
      converters={converters}
      // Inline code marks render as <code>; style them like the old `code` mark.
      className="flex flex-col gap-4 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-surfaceElevated [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]"
    />
  );
}
