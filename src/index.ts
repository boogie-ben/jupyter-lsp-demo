import {
  JupyterFrontEnd,
  type JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { WidgetTracker, ISanitizer } from '@jupyterlab/apputils';
import { type CPWDocumentWidget, CPWFactory } from './widget';
import { ITranslator } from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  ILSPDocumentConnectionManager,
  ILSPFeatureManager,
  ILSPCodeExtractorsManager,
  IWidgetLSPAdapterTracker,
  type WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import { CPWAdapter } from './lspAdapter';
import type { IRenderMime } from '@jupyterlab/rendermime';
import { ICompletionProviderManager } from '@jupyterlab/completer';

const cpwIcon = new LabIcon({
  name: 'cpw:icon',
  svgstr:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#f37626" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 4c0-1.655.345-2 2-2h4c1.655 0 2 .345 2 2s-.345 2-2 2H5c-1.655 0-2-.345-2-2m10 9c0-1.655.345-2 2-2h4c1.655 0 2 .345 2 2s-.345 2-2 2h-4c-1.655 0-2-.345-2-2m-9 7c0-1.655.345-2 2-2h4c1.655 0 2 .345 2 2s-.345 2-2 2H6c-1.655 0-2-.345-2-2m13-9c0-.465 0-.697-.038-.89a2 2 0 0 0-1.572-1.572c-.193-.038-.425-.038-.89-.038h-5c-.465 0-.697 0-.89-.038A2 2 0 0 1 7.038 6.89C7 6.697 7 6.465 7 6m10 9v1c0 1.886 0 2.828-.586 3.414S14.886 20 13 20h-1" color="#f37626"/></svg>'
});
const cpwIcon64 =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjM3NjI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNMyA0YzAtMS42NTUuMzQ1LTIgMi0yaDRjMS42NTUgMCAyIC4zNDUgMiAycy0uMzQ1IDItMiAySDVjLTEuNjU1IDAtMi0uMzQ1LTItMm0xMCA5YzAtMS42NTUuMzQ1LTIgMi0yaDRjMS42NTUgMCAyIC4zNDUgMiAycy0uMzQ1IDItMiAyaC00Yy0xLjY1NSAwLTItLjM0NS0yLTJtLTkgN2MwLTEuNjU1LjM0NS0yIDItMmg0YzEuNjU1IDAgMiAuMzQ1IDIgMnMtLjM0NSAyLTIgMkg2Yy0xLjY1NSAwLTItLjM0NS0yLTJtMTMtOWMwLS40NjUgMC0uNjk3LS4wMzgtLjg5YTIgMiAwIDAgMC0xLjU3Mi0xLjU3MmMtLjE5My0uMDM4LS40MjUtLjAzOC0uODktLjAzOGgtNWMtLjQ2NSAwLS42OTcgMC0uODktLjAzOEEyIDIgMCAwIDEgNy4wMzggNi44OUM3IDYuNjk3IDcgNi40NjUgNyA2bTEwIDl2MWMwIDEuODg2IDAgMi44MjgtLjU4NiAzLjQxNFMxNC44ODYgMjAgMTMgMjBoLTEiIGNvbG9yPSIjZjM3NjI2Ii8+PC9zdmc+';

const COMMAND = 'cpw:new';

const FACTORY = 'CPW';

function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  translator: ITranslator,
  paths: JupyterFrontEnd.IPaths,
  lspDocumentConnectionManager: ILSPDocumentConnectionManager,
  lspFeatureManager: ILSPFeatureManager,
  lspCodeExtractorsManager: ILSPCodeExtractorsManager,
  widgetLSPAdapterTracker: IWidgetLSPAdapterTracker,
  appSanitizer: IRenderMime.ISanitizer,
  completionProviderManager: ICompletionProviderManager
) {
  const tracker = new WidgetTracker<CPWDocumentWidget>({ namespace: 'cpw' });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  const trans = translator.load('jupyterlab');

  const factory = new CPWFactory({
    name: FACTORY,
    fileTypes: ['cpw'],
    defaultFor: ['cpw'],
    commands: app.commands,
    autoStartDefault: true,
    canStartKernel: true,
    // shutdownOnClose: true,
    shutdownOnClose: false,
    preferKernel: true
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = cpwIcon;
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });
    tracker.add(widget);
  });

  app.docRegistry.addWidgetFactory(factory);

  app.docRegistry.addFileType({
    name: 'cpw',
    displayName: 'Workflow',
    extensions: ['.cpw'],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    icon: cpwIcon,
    fileFormat: 'text',
    contentType: 'file'
  });

  // 从launcher新建cpw文件
  app.commands.addCommand(COMMAND, {
    label: 'demo',
    icon: cpwIcon,
    execute: args => {
      app.commands
        .execute('docmanager:new-untitled', {
          path: args.cwd,
          type: 'file',
          ext: '.cpw'
        })
        .then(model =>
          app.commands.execute('docmanager:open', {
            path: model.path,
            factory: FACTORY
          })
        );
    }
  });

  launcher.add({
    command: COMMAND,
    category: trans.__('Notebook'),
    rank: 0,
    kernelIconUrl: cpwIcon64
  });

  // ---------------------------------
  app.commands.addCommand('completer:invoke-cpw', {
    label: trans.__('Display the completion helper.'),
    execute: () => {
      const id = tracker.currentWidget?.id;
      if (id) {
        completionProviderManager.invoke(id);
      }
    }
  });

  app.commands.addCommand('completer:select-cpw', {
    label: trans.__('Select the completion suggestion.'),
    execute: () => {
      const id = tracker.currentWidget?.id;
      if (id) {
        return completionProviderManager.select(id);
      }
    }
  });

  app.commands.addKeyBinding({
    command: 'completer:select-cpw',
    keys: ['Enter'],
    selector: '.cpw-cell-editor-section-content .jp-mod-completer-active'
  });

  const updateCompleter = async (
    _: WidgetTracker<CPWDocumentWidget> | undefined,
    widget: CPWDocumentWidget
  ) => {
    const completerContext = {
      editor: widget.content.activeEditor ?? null,
      session: widget.context.sessionContext.session,
      widget,
      sanitizer: appSanitizer
    };
    await completionProviderManager.updateCompleter(completerContext);
    widget.content.activeEditorChanged.connect((_, editor) => {
      const newCompleterContext = {
        editor,
        session: widget.context.sessionContext.session,
        widget,
        sanitizer: appSanitizer
      };
      return completionProviderManager.updateCompleter(newCompleterContext);
    });
    widget.context.sessionContext.sessionChanged.connect(() => {
      const newCompleterContext = {
        editor: widget.content.activeEditor ?? null,
        session: widget.context.sessionContext.session,
        widget
      };
      return completionProviderManager.updateCompleter(newCompleterContext);
    });
  };

  tracker.widgetAdded.connect(updateCompleter);

  completionProviderManager.activeProvidersChanged.connect(() => {
    tracker.forEach(widget =>
      updateCompleter(undefined, widget).catch(e => console.error(e))
    );
  });

  tracker.widgetAdded.connect((_, cpwDoc) => {
    const lspApdapt = new CPWAdapter(cpwDoc, {
      connectionManager: lspDocumentConnectionManager,
      featureManager: lspFeatureManager,
      foreignCodeExtractorsManager: lspCodeExtractorsManager
    });
    (widgetLSPAdapterTracker as WidgetLSPAdapterTracker).add(lspApdapt);
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'lsp-demp',
  description: 'Enable Canvas Pipeline Workflow.',
  autoStart: true,
  // optional: [],
  requires: [
    ILauncher,
    ILayoutRestorer,
    ITranslator,
    JupyterFrontEnd.IPaths,
    ILSPDocumentConnectionManager,
    ILSPFeatureManager,
    ILSPCodeExtractorsManager,
    IWidgetLSPAdapterTracker,
    ISanitizer,
    ICompletionProviderManager
  ],
  activate
};

export default [plugin];
