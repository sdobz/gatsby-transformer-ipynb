const crypto = require(`crypto`)
const React = require(`react`)
const ReactDOMServer = require(`react-dom/server`)
const NotebookRender = require(`@rafaelquintanilha/notebook-render`).default

module.exports = async function onCreateNode(
  { node, loadNodeContent, actions },
  pluginOptions // eslint-disable-line no-unused-vars
) {
  const { createNode, createParentChildLink } = actions

  // Filter out non-ipynb content by file extension and checkpoint notebooks
  if (
    node.extension !== `ipynb` ||
    String(node.absolutePath).includes(`.ipynb_checkpoints`)
  ) {
    return
  }
  // see: http://jupyter.readthedocs.io/en/latest/reference/mimetype.html
  // if (node.internal.mediaType !== `application/x-ipynb+json`) {
  //   return
  // }

  const content = await loadNodeContent(node)

  const jupyterNode = {
    id: `${node.id} >>> JupyterNotebook`,
    children: [],
    parent: node.id,
    internal: {
      content,
      type: `JupyterNotebook`,
    },
  }

  jupyterNode.json = JSON.parse(content)

  jupyterNode.metadata = jupyterNode.json.metadata

  // render statically html with @nteract/notebook-render element
  const reactComponent = React.createElement(
    NotebookRender,
    {
      notebook: jupyterNode.json,
      ...(pluginOptions.notebookProps ? pluginOptions.notebookProps : {}),
    },
    null
  )
  jupyterNode.html = ReactDOMServer.renderToStaticMarkup(reactComponent)

  // Add path to the file path
  if (node.internal.type === `File`) {
    jupyterNode.fileAbsolutePath = node.absolutePath
    jupyterNode.fileRelativePath = node.relativePath
  }

  jupyterNode.internal.contentDigest = crypto
    .createHash(`md5`)
    .update(JSON.stringify(jupyterNode))
    .digest(`hex`)
  createNode(jupyterNode)
  createParentChildLink({
    parent: node,
    child: jupyterNode,
  })
}
