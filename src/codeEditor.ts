import {
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  EditorThemeRegistry,
  ybinding
} from '@jupyterlab/codemirror';

const languages = new EditorLanguageRegistry();
EditorLanguageRegistry.getDefaultLanguages()
  .filter(language => ['python'].includes(language.name.toLowerCase()))
  .forEach(language => {
    languages.addLanguage(language);
  });

const extensions = new EditorExtensionRegistry();
const themes = new EditorThemeRegistry();
EditorThemeRegistry.getDefaultThemes().forEach(theme => themes.addTheme(theme));
EditorExtensionRegistry.getDefaultExtensions({ themes }).forEach(
  extensionFactory => extensions.addExtension(extensionFactory)
);
extensions.addExtension({
  name: 'shared-model-binding',
  factory: options => {
    const sharedModel = options.model.sharedModel as any;
    return EditorExtensionRegistry.createImmutableExtension(
      ybinding({
        ytext: sharedModel.ysource,
        undoManager: sharedModel.undoManager ?? undefined
      })
    );
  }
});

export { languages, extensions };
