function escapeTags(text) {
  return text
    .replace(/{/g, '{open}')
    .replace(/}/g, '{close}');
}

export function renderInline(text) {
  let result = escapeTags(text);

  result = result.replace(/`([^`]+)`/g, (_, code) => {
    return `{green-fg}${code}{/green-fg}`;
  });

  result = result.replace(/\*\*([^*]+)\*\*/g, (_, bold) => {
    return `{bold}${bold}{/bold}`;
  });

  result = result.replace(/\*([^*]+)\*/g, (_, italic) => {
    return `{italic}${italic}{/italic}`;
  });

  return result;
}

export function renderMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeContent = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push(`{green-fg}${codeContent.join('\n')}{/green-fg}`);
        codeContent = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      result.push(`{bold}${escapeTags(trimmed.slice(4))}{/bold}`);
    } else if (trimmed.startsWith('## ')) {
      result.push(`{bold}${escapeTags(trimmed.slice(3))}{/bold}`);
    } else if (trimmed.startsWith('# ')) {
      result.push(`{bold}${escapeTags(trimmed.slice(2))}{/bold}`);
    } else {
      result.push(renderInline(line));
    }
  }

  if (inCodeBlock && codeContent.length > 0) {
    result.push(`{green-fg}${codeContent.join('\n')}{/green-fg}`);
  }

  return result.join('\n');
}
