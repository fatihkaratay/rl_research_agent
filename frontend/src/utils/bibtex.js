/**
 * Feature 15: BibTeX export utility.
 */

/**
 * Generate a BibTeX entry for a paper.
 * @param {Object} paper
 * @returns {string} BibTeX string
 */
export function generateBibTeX(paper) {
  const arxivId = (paper.arxiv_id || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
  const title = (paper.title || 'Unknown Title').replace(/[{}]/g, '');
  const authors = (paper.authors || []).join(' and ');
  const year = paper.published_date
    ? paper.published_date.slice(0, 4)
    : new Date().getFullYear();
  const url = paper.pdf_url || `https://arxiv.org/abs/${paper.arxiv_id}`;

  return `@article{${arxivId},
  title     = {${title}},
  author    = {${authors}},
  year      = {${year}},
  url       = {${url}},
  note      = {arXiv preprint}
}`;
}

/**
 * Copy BibTeX to clipboard and return success flag.
 * @param {Object} paper
 * @returns {Promise<boolean>}
 */
export async function copyBibTeX(paper) {
  try {
    const bib = generateBibTeX(paper);
    await navigator.clipboard.writeText(bib);
    return true;
  } catch {
    return false;
  }
}
