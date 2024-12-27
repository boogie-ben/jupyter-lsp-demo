import {
  type Document,
  type IAdapterOptions,
  untilReady,
  VirtualDocument,
  WidgetLSPAdapter
} from '@jupyterlab/lsp';
import { PromiseDelegate } from '@lumino/coreutils';
// import { IEditorMimeTypeService } from '@jupyterlab/codeeditor'
import type { CPWDocumentWidget } from './widget';
import { Signal } from '@lumino/signaling';
import {
  CodeMirrorEditorFactory,
  type CodeMirrorEditor
} from '@jupyterlab/codemirror';
import { extensions, languages } from './codeEditor';
import { CodeEditor } from '@jupyterlab/codeeditor';

export class CPWAdapter extends WidgetLSPAdapter<CPWDocumentWidget> {
  constructor(widget: CPWDocumentWidget, options: IAdapterOptions) {
    super(widget, options);
    this.cpw = widget.content;

    Promise.all([
      this.widget.context.sessionContext.ready,
      this.connectionManager.ready
    ])
      .then(async () => {
        await this.initOnceReady();
        this._readyDelegate.resolve();
      })
      .catch(console.error);
  }

  readonly cpw: CPWDocumentWidget['content'];

  get documentPath(): string {
    return this.widget.context.path;
  }

  private _readyDelegate = new PromiseDelegate<void>();

  get mimeType() {
    return 'text/x-python';
  }

  get languageFileExtension() {
    return 'py';
  }

  get wrapperElement(): HTMLElement {
    return this.widget.node;
  }

  getEditorWrapper(ceEditor: Document.IEditor): HTMLElement {
    return ceEditor.getEditor()!.host;
  }

  getEditorIndexAt() {
    return 0;
  }

  getEditorIndex() {
    return 0;
  }

  get ready() {
    return this._readyDelegate.promise;
  }

  isReady(): boolean {
    return (
      !this.widget.isDisposed &&
      this.widget.context.isReady &&
      this.widget.content.isVisible &&
      this.widget.context.sessionContext.session?.kernel !== null
    );
  }

  get activeEditor(): Document.IEditor | undefined {
    return this.cpw.activeEditor
      ? wrapEditor(this.cpw.activeEditor)
      : // : undefined; // if activeEditor is empty, lsp contenxt.ts will throw an error
        wrapEditor(getPlaceholderEidtor());
  }

  private _activeChanged(
    sender: CPWDocumentWidget['content'],
    editor: CodeMirrorEditor | null
  ) {
    if (editor) {
      this._activeEditorChanged.emit({ editor: wrapEditor(editor) });
      // when editor content changed, update VirtualDocument
      editor.model.sharedModel.changed.connect(
        this._activeEditorContentChanged,
        this
      );
      this.updateDocuments();
    }
  }

  private _activeEditorContentChanged() {
    this.updateDocuments();
  }

  get editors(): Document.ICodeBlockOptions[] {
    if (this.isDisposed || !this.activeEditor) {
      return [];
    }
    return [
      {
        ceEditor: this.activeEditor,
        type: 'code',
        value:
          this.activeEditor!.getEditor()?.model.sharedModel.getSource() ?? ''
      }
    ];
  }

  protected async initOnceReady(): Promise<void> {
    await untilReady(this.isReady.bind(this), -1);
    this.initVirtual();
    this.connectDocument(this.virtualDocument!, false).catch(console.warn);
    this.cpw.activeEditorChanged.connect(this._activeChanged, this);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.cpw.activeEditorChanged.disconnect(this._activeChanged, this);
    super.dispose();
    Signal.clearData(this);
  }

  createVirtualDocument(): VirtualDocument {
    return new VirtualDocument({
      language: this.language,
      foreignCodeExtractors: this.options.foreignCodeExtractorsManager,
      path: this.documentPath,
      fileExtension: this.languageFileExtension,
      standalone: false,
      hasLspSupportedFile: false
    });
  }
}

const wrapEditor = (editor: CodeMirrorEditor): Document.IEditor =>
  Object.freeze({
    getEditor: () => editor,
    ready: async () => editor,
    reveal: async () => editor
  });

const getPlaceholderEidtor = (): CodeMirrorEditor => {
  const factory = new CodeMirrorEditorFactory({ extensions, languages });
  const model = new CodeEditor.Model({ mimeType: 'text/x-python' });
  model.sharedModel.setSource('');
  return factory.newInlineEditor({
    host: document.createElement('div'),
    model,
    config: { lineNumbers: false, lineWrap: false }
  });
};
