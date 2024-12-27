import type { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';
import {
  type DocumentRegistry,
  ABCWidgetFactory,
  DocumentWidget
} from '@jupyterlab/docregistry';

import {
  CodeMirrorEditorFactory,
  type CodeMirrorEditor
} from '@jupyterlab/codemirror';
import { Signal } from '@lumino/signaling';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { extensions, languages } from './codeEditor';

class CPWWidget extends Widget {
  private _context: DocumentRegistry.Context;
  // private _editors: CodeMirrorEditor[] = [];

  private _activeEditorChanged = new Signal<this, CodeMirrorEditor | null>(
    this
  );
  get activeEditorChanged() {
    return this._activeEditorChanged;
  }

  private _activeEditor: CodeMirrorEditor | null = null;
  get activeEditor() {
    return this._activeEditor;
  }

  get session() {
    return this._context.sessionContext.session;
  }

  constructor(options: {
    commands: CommandRegistry;
    context: DocumentRegistry.Context;
  }) {
    super();
    this._context = options.context;

    this._context.ready.then(() => {
      this.init();
    });
  }

  init() {
    this.node.style.display = 'flex';
    this.node.style.flexDirection = 'column';
    this.node.style.backgroundColor = '#888';
    this.node.style.rowGap = '24px';
    this.node.style.padding = '24px';

    this.node.appendChild(this.newEditor());
    this.node.appendChild(this.newEditor());
  }

  newEditor() {
    const factory = new CodeMirrorEditorFactory({ extensions, languages });
    const model = new CodeEditor.Model({ mimeType: 'text/x-python' });

    const editorWrapper = document.createElement('div');

    const editor = factory.newInlineEditor({
      host: editorWrapper,
      model,
      config: {
        lineNumbers: false,
        lineWrap: false
      }
    });

    editor.handleEvent = e => {
      if (e.type === 'focus') {
        this.setCurrentEditor(editor);
      } else if (e.type === 'blur') {
        this.setCurrentEditor(null);
      }
    };

    return editorWrapper;
  }

  setCurrentEditor(editor: CodeMirrorEditor | null) {
    if (this._activeEditor === editor) {
      return;
    }
    if (this._activeEditor) {
      Signal.disconnectAll(this._activeEditor.model.sharedModel.changed);
    }
    this._activeEditor = editor;
    this._activeEditorChanged.emit(editor);
  }
}

export class CPWDocumentWidget extends DocumentWidget<CPWWidget> {
  constructor(
    options: DocumentWidget.IOptions<CPWWidget, DocumentRegistry.IModel>
  ) {
    super(options);
    this.toolbar.dispose(); // 不要默认的toolbar
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace, no-unused-vars
namespace CPWFactory {
  export interface ICPWFactoryOptions
    extends DocumentRegistry.IWidgetFactoryOptions {
    commands: CommandRegistry;
  }
}

// eslint-disable-next-line no-redeclare
export class CPWFactory extends ABCWidgetFactory<
  CPWDocumentWidget,
  DocumentRegistry.IModel
> {
  constructor(options: CPWFactory.ICPWFactoryOptions) {
    super(options);
    this._commands = options.commands;
  }

  protected createNewWidget(
    context: DocumentRegistry.Context
  ): CPWDocumentWidget {
    return new CPWDocumentWidget({
      context,
      content: new CPWWidget({ commands: this._commands, context })
    });
  }

  private _commands: CommandRegistry;
}
