import Link from 'next/link';
import Image from 'next/image';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';

export const mdxComponents: NonNullable<MDXRemoteProps['components']> = {
  a: ({ href = '', children, ...rest }) => {
    const isInternal = href.startsWith('/') || href.startsWith('#');
    if (isInternal) {
      return (
        <Link href={href} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  },
  img: (props) => {
    const { src = '', alt = '', width, height, ...rest } = props as {
      src?: string;
      alt?: string;
      width?: number | string;
      height?: number | string;
    };
    return (
      <Image
        src={src}
        alt={alt}
        width={Number(width) || 1200}
        height={Number(height) || 800}
        {...rest}
      />
    );
  },
};
