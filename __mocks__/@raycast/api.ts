/**
 * @raycast/api のモック
 */

export const environment = {
  supportPath: '/tmp/test-support-path'
};

export const getPreferenceValues = () => ({
  apiKey: 'test-api-key'
});

export const showToast = async () => {};

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated'
  }
};

export const List = {
  Item: () => null,
  EmptyView: () => null
};

export const Detail = () => null;

export const ActionPanel = () => null;

export const Action = {
  Push: () => null,
  OpenInBrowser: () => null,
  CopyToClipboard: () => null
};

export const Form = {
  TextField: () => null,
  TextArea: () => null,
  Checkbox: () => null
};

export const Icon = {
  Document: 'document',
  Trash: 'trash',
  ArrowClockwise: 'arrow-clockwise',
  Plus: 'plus',
  Pencil: 'pencil'
};

export const Color = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue'
};

export const Alert = {
  ActionStyle: {
    Default: 'default',
    Destructive: 'destructive',
    Cancel: 'cancel'
  }
};

export const confirmAlert = async () => true;

export const Clipboard = {
  copy: async () => {}
};

export const open = async () => {};

export const launchCommand = async () => {};

export const popToRoot = async () => {};

export const closeMainWindow = async () => {};
