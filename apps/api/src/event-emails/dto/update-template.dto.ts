import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'b', 'i',
  'a', 'span', 'div',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'src', 'alt', 'class', 'width', 'height'];

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

export class UpdateTemplateDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim() : value))
  subject: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? sanitize(value) : value))
  bodyHtml: string;

  @IsOptional()
  @IsString()
  bodyText?: string;
}
