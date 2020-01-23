interface Message {
    jsonrpc: string;
}

interface RequestMessage extends Message {

	/**
	 * The request id.
	 */
    id: number | string;

	/**
	 * The method to be invoked.
	 */
    method: string;

	/**
	 * The method's params.
	 */
    params?: array | object;
}

interface ResponseMessage extends Message {
	/**
	 * The request id.
	 */
    id: number | string | null;

	/**
	 * The result of a request. This member is REQUIRED on success.
	 * This member MUST NOT exist if there was an error invoking the method.
	 */
    result?: string | number | boolean | object | null;

	/**
	 * The error object in case a request fails.
	 */
    error?: ResponseError;
}

interface ResponseError {
	/**
	 * A number indicating the error type that occurred.
	 */
    code: number;

	/**
	 * A string providing a short description of the error.
	 */
    message: string;

	/**
	 * A primitive or structured value that contains additional
	 * information about the error. Can be omitted.
	 */
    data?: string | number | boolean | array | object | null;
}

export namespace ErrorCodes {
    // Defined by JSON RPC
    export const ParseError: number = -32700;
    export const InvalidRequest: number = -32600;
    export const MethodNotFound: number = -32601;
    export const InvalidParams: number = -32602;
    export const InternalError: number = -32603;
    export const serverErrorStart: number = -32099;
    export const serverErrorEnd: number = -32000;
    export const ServerNotInitialized: number = -32002;
    export const UnknownErrorCode: number = -32001;

    // Defined by the protocol.
    export const RequestCancelled: number = -32800;
    export const ContentModified: number = -32801;
}

interface NotificationMessage extends Message {
	/**
	 * The method to be invoked.
	 */
    method: string;

	/**
	 * The notification's params.
	 */
    params?: array | object;
}

interface CancelParams {
	/**
	 * The request id to cancel.
	 */
    id: number | string;
}

type ProgressToken = number | string;
interface ProgressParams<T> {
	/**
	 * The progress token provided by the client or server.
	 */
    token: ProgressToken;

	/**
	 * The progress data.
	 */
    value: T;
}

type DocumentUri = string;

export const EOL: string[] = ['\n', '\r\n', '\r'];

interface Position {
	/**
	 * Line position in a document (zero-based).
	 */
    line: number;

	/**
	 * Character offset on a line in a document (zero-based). Assuming that the line is
	 * represented as a string, the `character` value represents the gap between the
	 * `character` and `character + 1`.
	 *
	 * If the character value is greater than the line length it defaults back to the
	 * line length.
	 */
    character: number;
}

interface Range {
	/**
	 * The range's start position.
	 */
    start: Position;

	/**
	 * The range's end position.
	 */
    end: Position;
}

interface Location {
    uri: DocumentUri;
    range: Range;
}

interface LocationLink {

	/**
	 * Span of the origin of this link.
	 *
	 * Used as the underlined span for mouse interaction. Defaults to the word range at
	 * the mouse position.
	 */
    originSelectionRange?: Range;

	/**
	 * The target resource identifier of this link.
	 */
    targetUri: DocumentUri;

	/**
	 * The full target range of this link. If the target for example is a symbol then target range is the
	 * range enclosing this symbol not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to highlight the range in the editor.
	 */
    targetRange: Range;

	/**
	 * The range that should be selected and revealed when this link is being followed, e.g the name of a function.
	 * Must be contained by the the `targetRange`. See also `DocumentSymbol#range`
	 */
    targetSelectionRange: Range;
}

export interface Diagnostic {
	/**
	 * The range at which the message applies.
	 */
    range: Range;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning, info or hint.
	 */
    severity?: DiagnosticSeverity;

	/**
	 * The diagnostic's code, which might appear in the user interface.
	 */
    code?: number | string;

	/**
	 * A human-readable string describing the source of this
	 * diagnostic, e.g. 'typescript' or 'super lint'.
	 */
    source?: string;

	/**
	 * The diagnostic's message.
	 */
    message: string;

	/**
	 * Additional metadata about the diagnostic.
	 *
	 * @since 3.15.0
	 */
    tags?: DiagnosticTag[];

	/**
	 * An array of related diagnostic information, e.g. when symbol-names within
	 * a scope collide all definitions can be marked via this property.
	 */
    relatedInformation?: DiagnosticRelatedInformation[];
}

export namespace DiagnosticSeverity {
	/**
	 * Reports an error.
	 */
    export const Error: 1 = 1;
	/**
	 * Reports a warning.
	 */
    export const Warning: 2 = 2;
	/**
	 * Reports an information.
	 */
    export const Information: 3 = 3;
	/**
	 * Reports a hint.
	 */
    export const Hint: 4 = 4;
}

export type DiagnosticSeverity = 1 | 2 | 3 | 4;

/**
 * The diagnostic tags.
 *
 * @since 3.15.0
 */
export namespace DiagnosticTag {
    /**
     * Unused or unnecessary code.
     *
     * Clients are allowed to render diagnostics with this tag faded out instead of having
     * an error squiggle.
     */
    export const Unnecessary: 1 = 1;
    /**
     * Deprecated or obsolete code.
     *
     * Clients are allowed to rendered diagnostics with this tag strike through.
     */
    export const Deprecated: 2 = 2;
}

export type DiagnosticTag = 1 | 2;

/**
 * Represents a related message and source code location for a diagnostic. This should be
 * used to point to code locations that cause or are related to a diagnostics, e.g when duplicating
 * a symbol in a scope.
 */
export interface DiagnosticRelatedInformation {
	/**
	 * The location of this related diagnostic information.
	 */
    location: Location;

	/**
	 * The message of this related diagnostic information.
	 */
    message: string;
}

interface Command {
	/**
	 * Title of the command, like `save`.
	 */
    title: string;
	/**
	 * The identifier of the actual command handler.
	 */
    command: string;
	/**
	 * Arguments that the command handler should be
	 * invoked with.
	 */
    arguments?: any[];
}

interface TextEdit {
	/**
	 * The range of the text document to be manipulated. To insert
	 * text into a document create a range where start === end.
	 */
    range: Range;

	/**
	 * The string to be inserted. For delete operations use an
	 * empty string.
	 */
    newText: string;
}

export interface TextDocumentEdit {
	/**
	 * The text document to change.
	 */
    textDocument: VersionedTextDocumentIdentifier;

	/**
	 * The edits to be applied.
	 */
    edits: TextEdit[];
}

/**
 * Options to create a file.
 */
export interface CreateFileOptions {
	/**
	 * Overwrite existing file. Overwrite wins over `ignoreIfExists`
	 */
    overwrite?: boolean;
	/**
	 * Ignore if exists.
	 */
    ignoreIfExists?: boolean;
}

/**
 * Create file operation
 */
export interface CreateFile {
	/**
	 * A create
	 */
    kind: 'create';
	/**
	 * The resource to create.
	 */
    uri: DocumentUri;
	/**
	 * Additional options
	 */
    options?: CreateFileOptions;
}

/**
 * Rename file options
 */
export interface RenameFileOptions {
	/**
	 * Overwrite target if existing. Overwrite wins over `ignoreIfExists`
	 */
    overwrite?: boolean;
	/**
	 * Ignores if target exists.
	 */
    ignoreIfExists?: boolean;
}

/**
 * Rename file operation
 */
export interface RenameFile {
	/**
	 * A rename
	 */
    kind: 'rename';
	/**
	 * The old (existing) location.
	 */
    oldUri: DocumentUri;
	/**
	 * The new location.
	 */
    newUri: DocumentUri;
	/**
	 * Rename options.
	 */
    options?: RenameFileOptions;
}

/**
 * Delete file options
 */
export interface DeleteFileOptions {
	/**
	 * Delete the content recursively if a folder is denoted.
	 */
    recursive?: boolean;
	/**
	 * Ignore the operation if the file doesn't exist.
	 */
    ignoreIfNotExists?: boolean;
}

/**
 * Delete file operation
 */
export interface DeleteFile {
	/**
	 * A delete
	 */
    kind: 'delete';
	/**
	 * The file to delete.
	 */
    uri: DocumentUri;
	/**
	 * Delete options.
	 */
    options?: DeleteFileOptions;
}

export interface WorkspaceEdit {
	/**
	 * Holds changes to existing resources.
	 */
    changes?: { [uri: DocumentUri]: TextEdit[]; };

	/**
	 * Depending on the client capability `workspace.workspaceEdit.resourceOperations` document changes
	 * are either an array of `TextDocumentEdit`s to express changes to n different text documents
	 * where each text document edit addresses a specific version of a text document. Or it can contain
	 * above `TextDocumentEdit`s mixed with create, rename and delete file / folder operations.
	 *
	 * Whether a client supports versioned document edits is expressed via
	 * `workspace.workspaceEdit.documentChanges` client capability.
	 *
	 * If a client neither supports `documentChanges` nor `workspace.workspaceEdit.resourceOperations` then
	 * only plain `TextEdit`s using the `changes` property are supported.
	 */
    documentChanges?: (TextDocumentEdit[] | (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[]);
}

export interface WorkspaceEditClientCapabilities {
	/**
	 * The client supports versioned document changes in `WorkspaceEdit`s
	 */
    documentChanges?: boolean;

	/**
	 * The resource operations the client supports. Clients should at least
	 * support 'create', 'rename' and 'delete' files and folders.
	 *
	 * @since 3.13.0
	 */
    resourceOperations?: ResourceOperationKind[];

	/**
	 * The failure handling strategy of a client if applying the workspace edit
	 * fails.
	 *
	 * @since 3.13.0
	 */
    failureHandling?: FailureHandlingKind;
}

/**
 * The kind of resource operations supported by the client.
 */
export type ResourceOperationKind = 'create' | 'rename' | 'delete';

export namespace ResourceOperationKind {

	/**
	 * Supports creating new files and folders.
	 */
    export const Create: ResourceOperationKind = 'create';

	/**
	 * Supports renaming existing files and folders.
	 */
    export const Rename: ResourceOperationKind = 'rename';

	/**
	 * Supports deleting existing files and folders.
	 */
    export const Delete: ResourceOperationKind = 'delete';
}

export type FailureHandlingKind = 'abort' | 'transactional' | 'undo' | 'textOnlyTransactional';

export namespace FailureHandlingKind {

	/**
	 * Applying the workspace change is simply aborted if one of the changes provided
	 * fails. All operations executed before the failing operation stay executed.
	 */
    export const Abort: FailureHandlingKind = 'abort';

	/**
	 * All operations are executed transactional. That means they either all
	 * succeed or no changes at all are applied to the workspace.
	 */
    export const Transactional: FailureHandlingKind = 'transactional';


	/**
	 * If the workspace edit contains only textual file changes they are executed transactional.
	 * If resource changes (create, rename or delete file) are part of the change the failure
	 * handling strategy is abort.
	 */
    export const TextOnlyTransactional: FailureHandlingKind = 'textOnlyTransactional';

	/**
	 * The client tries to undo the operations already executed. But there is no
	 * guarantee that this is succeeding.
	 */
    export const Undo: FailureHandlingKind = 'undo';
}

interface TextDocumentIdentifier {
	/**
	 * The text document's URI.
	 */
    uri: DocumentUri;
}

interface TextDocumentItem {
	/**
	 * The text document's URI.
	 */
    uri: DocumentUri;

	/**
	 * The text document's language identifier.
	 */
    languageId: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
    version: number;

	/**
	 * The content of the opened text document.
	 */
    text: string;
}

interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
	/**
	 * The version number of this document. If a versioned text document identifier
	 * is sent from the server to the client and the file is not open in the editor
	 * (the server has not received an open notification before) the server can send
	 * `null` to indicate that the version is known and the content on disk is the
	 * master (as speced with document content ownership).
	 *
	 * The version number of a document will increase after each change, including
	 * undo/redo. The number doesn't need to be consecutive.
	 */
    version: number | null;
}

interface TextDocumentPositionParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The position inside the text document.
	 */
    position: Position;
}

export interface DocumentFilter {
	/**
	 * A language id, like `typescript`.
	 */
    language?: string;

	/**
	 * A Uri [scheme](#Uri.scheme), like `file` or `untitled`.
	 */
    scheme?: string;

	/**
	 * A glob pattern, like `*.{ts,js}`.
	 *
	 * Glob patterns can have the following syntax:
	 * - `*` to match one or more characters in a path segment
	 * - `?` to match on one character in a path segment
	 * - `**` to match any number of path segments, including none
	 * - `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
	 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
	 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
	 */
    pattern?: string;
}

export type DocumentSelector = DocumentFilter[];

/**
 * Static registration options to be returned in the initialize request.
 */
export interface StaticRegistrationOptions {
	/**
	 * The id used to register the request. The id can be used to deregister
	 * the request again. See also Registration#id.
	 */
    id?: string;
}

/**
 * General text document registration options.
 */
export interface TextDocumentRegistrationOptions {
	/**
	 * A document selector to identify the scope of the registration. If set to null
	 * the document selector provided on the client side will be used.
	 */
    documentSelector: DocumentSelector | null;
}

/**
 * Describes the content type that a client supports in various
 * result literals like `Hover`, `ParameterInfo` or `CompletionItem`.
 *
 * Please note that `MarkupKinds` must not start with a `$`. This kinds
 * are reserved for internal usage.
 */
export namespace MarkupKind {
	/**
	 * Plain text is supported as a content format
	 */
    export const PlainText: 'plaintext' = 'plaintext';

	/**
	 * Markdown is supported as a content format
	 */
    export const Markdown: 'markdown' = 'markdown';
}
export type MarkupKind = 'plaintext' | 'markdown';

/**
 * A `MarkupContent` literal represents a string value which content is interpreted base on its
 * kind flag. Currently the protocol supports `plaintext` and `markdown` as markup kinds.
 *
 * If the kind is `markdown` then the value can contain fenced code blocks like in GitHub issues.
 * See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * Here is an example how such a string can be constructed using JavaScript / TypeScript:
 * ```typescript
 * let markdown: MarkdownContent = {
 *  kind: MarkupKind.Markdown,
 *	value: [
 *		'# Header',
 *		'Some text',
 *		'```typescript',
 *		'someCode();',
 *		'```'
 *	].join('\n')
 * };
 * ```
 *
 * *Please Note* that clients might sanitize the return markdown. A client could decide to
 * remove HTML from the markdown to avoid script execution.
 */
export interface MarkupContent {
	/**
	 * The type of the Markup
	 */
    kind: MarkupKind;

	/**
	 * The content itself
	 */
    value: string;
}

export interface WorkDoneProgressBegin {

    kind: 'begin';

	/**
	 * Mandatory title of the progress operation. Used to briefly inform about
	 * the kind of operation being performed.
	 *
	 * Examples: "Indexing" or "Linking dependencies".
	 */
    title: string;

	/**
	 * Controls if a cancel button should show to allow the user to cancel the
	 * long running operation. Clients that don't support cancellation are allowed
	 * to ignore the setting.
	 */
    cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
    message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule.
	 */
    percentage?: number;
}

export interface WorkDoneProgressReport {

    kind: 'report';

	/**
	 * Controls enablement state of a cancel button. This property is only valid if a cancel
	 * button got requested in the `WorkDoneProgressStart` payload.
	 *
	 * Clients that don't support cancellation or don't support control the button's
	 * enablement state are allowed to ignore the setting.
	 */
    cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
    message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule.
	 */
    percentage?: number;
}

export interface WorkDoneProgressEnd {

    kind: 'end';

	/**
	 * Optional, a final message indicating to for example indicate the outcome
	 * of the operation.
	 */
    message?: string;
}

export interface WorkDoneProgressParams {
	/**
	 * An optional token that a server can use to report work done progress.
	 */
    workDoneToken?: ProgressToken;
}

export interface WorkDoneProgressOptions {
    workDoneProgress?: boolean;
}

export interface PartialResultParams {
	/**
	 * An optional token that a server can use to report partial results (e.g. streaming) to
	 * the client.
	 */
    partialResultToken?: ProgressToken;
}

interface InitializeParams {
	/**
	 * The process Id of the parent process that started
	 * the server. Is null if the process has not been started by another process.
	 * If the parent process is not alive then the server should exit (see exit notification) its process.
	 */
    processId: number | null;

	/**
	 * Information about the client
	 *
	 * @since 3.15.0
	 */
    clientInfo?: {
		/**
		 * The name of the client as defined by the client.
		 */
        name: string;

		/**
		 * The client's version as defined by the client.
		 */
        version?: string;
    };

	/**
	 * The rootPath of the workspace. Is null
	 * if no folder is open.
	 *
	 * @deprecated in favour of rootUri.
	 */
    rootPath?: string | null;

	/**
	 * The rootUri of the workspace. Is null if no
	 * folder is open. If both `rootPath` and `rootUri` are set
	 * `rootUri` wins.
	 */
    rootUri: DocumentUri | null;

	/**
	 * User provided initialization options.
	 */
    initializationOptions?: any;

	/**
	 * The capabilities provided by the client (editor or tool)
	 */
    capabilities: ClientCapabilities;

	/**
	 * The initial trace setting. If omitted trace is disabled ('off').
	 */
    trace?: 'off' | 'messages' | 'verbose';

	/**
	 * The workspace folders configured in the client when the server starts.
	 * This property is only available if the client supports workspace folders.
	 * It can be `null` if the client supports workspace folders but none are
	 * configured.
	 *
	 * @since 3.6.0
	 */
    workspaceFolders?: WorkspaceFolder[] | null;
}

/**
 * Text document specific client capabilities.
 */
export interface TextDocumentClientCapabilities {

    synchronization?: TextDocumentSyncClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/completion` request.
	 */
    completion?: CompletionClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/hover` request.
	 */
    hover?: HoverClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/signatureHelp` request.
	 */
    signatureHelp?: SignatureHelpClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/declaration` request.
	 *
	 * @since 3.14.0
	 */
    declaration?: DeclarationClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/definition` request.
	 */
    definition?: DefinitionClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/typeDefinition` request.
	 *
	 * @since 3.6.0
	 */
    typeDefinition?: TypeDefinitionClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/implementation` request.
	 *
	 * @since 3.6.0
	 */
    implementation?: ImplementationClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/references` request.
	 */
    references?: ReferenceClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/documentHighlight` request.
	 */
    documentHighlight?: DocumentHighlightClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/documentSymbol` request.
	 */
    documentSymbol?: DocumentSymbolClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/codeAction` request.
	 */
    codeAction?: CodeActionClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/codeLens` request.
	 */
    codeLens?: CodeLensClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/documentLink` request.
	 */
    documentLink?: DocumentLinkClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/documentColor` and the
	 * `textDocument/colorPresentation` request.
	 *
	 * @since 3.6.0
	 */
    colorProvider?: DocumentColorClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/formatting` request.
	 */
    formatting?: DocumentFormattingClientCapabilities

	/**
	 * Capabilities specific to the `textDocument/rangeFormatting` request.
	 */
    rangeFormatting?: DocumentRangeFormattingClientCapabilities;

	/** request.
	 * Capabilities specific to the `textDocument/onTypeFormatting` request.
	 */
    onTypeFormatting?: DocumentOnTypeFormattingClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/rename` request.
	 */
    rename?: RenameClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/publishDiagnostics` notification.
	 */
    publishDiagnostics?: PublishDiagnosticsClientCapabilities;

	/**
	 * Capabilities specific to the `textDocument/foldingRange` request.
	 *
	 * @since 3.10.0
	 */
    foldingRange?: FoldingRangeClientCapabilities;
}

interface ClientCapabilities {
	/**
	 * Workspace specific client capabilities.
	 */
    workspace?: {
		/**
		* The client supports applying batch edits
		* to the workspace by supporting the request
		* 'workspace/applyEdit'
		*/
        applyEdit?: boolean;

		/**
		* Capabilities specific to `WorkspaceEdit`s
		*/
        workspaceEdit?: WorkspaceEditClientCapabilities;

		/**
		* Capabilities specific to the `workspace/didChangeConfiguration` notification.
		*/
        didChangeConfiguration?: DidChangeConfigurationClientCapabilities;

		/**
		* Capabilities specific to the `workspace/didChangeWatchedFiles` notification.
		*/
        didChangeWatchedFiles?: DidChangeWatchedFilesClientCapabilities;

		/**
		* Capabilities specific to the `workspace/symbol` request.
		*/
        symbol?: WorkspaceSymbolClientCapabilities;

		/**
		* Capabilities specific to the `workspace/executeCommand` request.
		*/
        executeCommand?: ExecuteCommandClientCapabilities;
    };

	/**
	 * Text document specific client capabilities.
	 */
    textDocument?: TextDocumentClientCapabilities;

	/**
	 * Experimental client capabilities.
	 */
    experimental?: any;
}

interface InitializeResult {
	/**
	 * The capabilities the language server provides.
	 */
    capabilities: ServerCapabilities;

	/**
	 * Information about the server.
	 *
	 * @since 3.15.0
	 */
    serverInfo?: {
		/**
		 * The name of the server as defined by the server.
		 */
        name: string;

		/**
		 * The server's version as defined by the server.
		 */
        version?: string;
    };
}

/**
 * Known error codes for an `InitializeError`;
 */
export namespace InitializeError {
	/**
	 * If the protocol version provided by the client can't be handled by the server.
	 * @deprecated This initialize error got replaced by client capabilities. There is
	 * no version handshake in version 3.0x
	 */
    export const unknownProtocolVersion: number = 1;
}

interface InitializeError {
	/**
	 * Indicates whether the client execute the following retry logic:
	 * (1) show the message provided by the ResponseError to the user
	 * (2) user selects retry or cancel
	 * (3) if user selected retry the initialize method is sent again.
	 */
    retry: boolean;
}

/**
 * Execute command options.
 */
export interface ExecuteCommandOptions {
	/**
	 * The commands to be executed on the server
	 */
    commands: string[]
}

interface ServerCapabilities {
	/**
	 * Defines how text documents are synced. Is either a detailed structure defining each notification or
	 * for backwards compatibility the TextDocumentSyncKind number. If omitted it defaults to `TextDocumentSyncKind.None`.
	 */
    textDocumentSync?: TextDocumentSyncOptions | number;

	/**
	 * The server provides completion support.
	 */
    completionProvider?: CompletionOptions;

	/**
	 * The server provides hover support.
	 */
    hoverProvider?: boolean | HoverOptions;

	/**
	 * The server provides signature help support.
	 */
    signatureHelpProvider?: SignatureHelpOptions;

	/**
	 * The server provides go to declaration support.
	 *
	 * @since 3.14.0
	 */
    declarationProvider?: boolean | DeclarationOptions | DeclarationRegistrationOptions;

	/**
	 * The server provides goto definition support.
	 */
    definitionProvider?: boolean | DefinitionOptions;

	/**
	 * The server provides goto type definition support.
	 *
	 * @since 3.6.0
	 */
    typeDefinitionProvider?: boolean | TypeDefinitionOptions | TypeDefinitionRegistrationOptions;

	/**
	 * The server provides goto implementation support.
	 *
	 * @since 3.6.0
	 */
    implementationProvider?: boolean | ImplementationOptions | ImplementationRegistrationOptions;

	/**
	 * The server provides find references support.
	 */
    referencesProvider?: boolean | ReferenceOptions;

	/**
	 * The server provides document highlight support.
	 */
    documentHighlightProvider?: boolean | DocumentHighlightOptions;

	/**
	 * The server provides document symbol support.
	 */
    documentSymbolProvider?: boolean | DocumentSymbolOptions;

	/**
	 * The server provides code actions. The `CodeActionOptions` return type is only
	 * valid if the client signals code action literal support via the property
	 * `textDocument.codeAction.codeActionLiteralSupport`.
	 */
    codeActionProvider?: boolean | CodeActionOptions;

	/**
	 * The server provides code lens.
	 */
    codeLensProvider?: CodeLensOptions;

	/**
	 * The server provides document link support.
	 */
    documentLinkProvider?: DocumentLinkOptions;

	/**
	 * The server provides color provider support.
	 *
	 * @since 3.6.0
	 */
    colorProvider?: boolean | DocumentColorOptions | DocumentColorRegistrationOptions;

	/**
	 * The server provides document formatting.
	 */
    documentFormattingProvider?: boolean | DocumentFormattingOptions;

	/**
	 * The server provides document range formatting.
	 */
    documentRangeFormattingProvider?: boolean | DocumentRangeFormattingOptions;

	/**
	 * The server provides document formatting on typing.
	 */
    documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;

	/**
	 * The server provides rename support. RenameOptions may only be
	 * specified if the client states that it supports
	 * `prepareSupport` in its initial `initialize` request.
	 */
    renameProvider?: boolean | RenameOptions;

	/**
	 * The server provides folding provider support.
	 *
	 * @since 3.10.0
	 */
    foldingRangeProvider?: boolean | FoldingRangeOptions | FoldingRangeRegistrationOptions;

	/**
	 * The server provides folding provider support.
	 *
	 * @since 3.10.0
	 */
    foldingRangeProvider?: boolean | FoldingRangeOptions | FoldingRangeRegistrationOptions;

	/**
	 * The server provides execute command support.
	 */
    executeCommandProvider?: ExecuteCommandOptions;

	/**
	 * The server provides workspace symbol support.
	 */
    workspaceSymbolProvider?: boolean;

	/**
	 * Workspace specific server capabilities
	 */
    workspace?: {
		/**
		 * The server supports workspace folder.
		 *
		 * @since 3.6.0
		 */
        workspaceFolders?: WorkspaceFoldersServerCapabilities;
    }

	/**
	 * Experimental server capabilities.
	 */
    experimental?: any;
}

interface InitializedParams {
}

interface ShowMessageParams {
	/**
	 * The message type. See {@link MessageType}.
	 */
    type: number;

	/**
	 * The actual message.
	 */
    message: string;
}

export namespace MessageType {
	/**
	 * An error message.
	 */
    export const Error = 1;
	/**
	 * A warning message.
	 */
    export const Warning = 2;
	/**
	 * An information message.
	 */
    export const Info = 3;
	/**
	 * A log message.
	 */
    export const Log = 4;
}

interface ShowMessageRequestParams {
	/**
	 * The message type. See {@link MessageType}
	 */
    type: number;

	/**
	 * The actual message
	 */
    message: string;

	/**
	 * The message action items to present.
	 */
    actions?: MessageActionItem[];
}

interface MessageActionItem {
	/**
	 * A short title like 'Retry', 'Open Log' etc.
	 */
    title: string;
}

interface LogMessageParams {
	/**
	 * The message type. See {@link MessageType}
	 */
    type: number;

	/**
	 * The actual message
	 */
    message: string;
}

export interface WorkDoneProgressCreateParams {
	/**
	 * The token to be used to report progress.
	 */
    token: ProgressToken;
}

/**
 * General parameters to register for a capability.
 */
export interface Registration {
	/**
	 * The id used to register the request. The id can be used to deregister
	 * the request again.
	 */
    id: string;

	/**
	 * The method / capability to register for.
	 */
    method: string;

	/**
	 * Options necessary for the registration.
	 */
    registerOptions?: any;
}

export interface RegistrationParams {
    registrations: Registration[];
}

export interface TextDocumentRegistrationOptions {
	/**
	 * A document selector to identify the scope of the registration. If set to null
	 * the document selector provided on the client side will be used.
	 */
    documentSelector: DocumentSelector | null;
}

/**
 * General parameters to unregister a capability.
 */
export interface Unregistration {
	/**
	 * The id used to unregister the request or notification. Usually an id
	 * provided during the register request.
	 */
    id: string;

	/**
	 * The method / capability to unregister for.
	 */
    method: string;
}

export interface UnregistrationParams {
    // This should correctly be named `unregistrations`. However changing this
    // is a breaking change and needs to wait until we deliver a 4.x version
    // of the specification.
    unregisterations: Unregistration[];
}

export interface WorkspaceFoldersServerCapabilities {
	/**
	 * The server has support for workspace folders
	 */
    supported?: boolean;

	/**
	 * Whether the server wants to receive workspace folder
	 * change notifications.
	 *
	 * If a string is provided, the string is treated as an ID
	 * under which the notification is registered on the client
	 * side. The ID can be used to unregister for these events
	 * using the `client/unregisterCapability` request.
	 */
    changeNotifications?: string | boolean;
}

export interface WorkspaceFolder {
	/**
	 * The associated URI for this workspace folder.
	 */
    uri: DocumentUri;

	/**
	 * The name of the workspace folder. Used to refer to this
	 * workspace folder in the user interface.
	 */
    name: string;
}

export interface DidChangeWorkspaceFoldersParams {
	/**
	 * The actual workspace folder change event.
	 */
    event: WorkspaceFoldersChangeEvent;
}

/**
 * The workspace folder change event.
 */
export interface WorkspaceFoldersChangeEvent {
	/**
	 * The array of added workspace folders
	 */
    added: WorkspaceFolder[];

	/**
	 * The array of the removed workspace folders
	 */
    removed: WorkspaceFolder[];
}

export interface DidChangeConfigurationClientCapabilities {
	/**
	 * Did change configuration notification supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

interface DidChangeConfigurationParams {
	/**
	 * The actual changed settings
	 */
    settings: any;
}

export interface ConfigurationParams {
    items: ConfigurationItem[];
}

export interface ConfigurationItem {
	/**
	 * The scope to get the configuration section for.
	 */
    scopeUri?: DocumentUri;

	/**
	 * The configuration section asked for.
	 */
    section?: string;
}

export interface DidChangeWatchedFilesClientCapabilities {
	/**
	 * Did change watched files notification supports dynamic registration. Please note
	 * that the current protocol doesn't support static configuration for file changes
	 * from the server side.
	 */
    dynamicRegistration?: boolean;
}

/**
 * Describe options to be used when registering for file system change events.
 */
export interface DidChangeWatchedFilesRegistrationOptions {
	/**
	 * The watchers to register.
	 */
    watchers: FileSystemWatcher[];
}

export interface FileSystemWatcher {
	/**
	 * The  glob pattern to watch.
	 *
	 * Glob patterns can have the following syntax:
	 * - `*` to match one or more characters in a path segment
	 * - `?` to match on one character in a path segment
	 * - `**` to match any number of path segments, including none
	 * - `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
	 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
	 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
	 */
    globPattern: string;

	/**
	 * The kind of events of interest. If omitted it defaults
	 * to WatchKind.Create | WatchKind.Change | WatchKind.Delete
	 * which is 7.
	 */
    kind?: number;
}

export namespace WatchKind {
	/**
	 * Interested in create events.
	 */
    export const Create = 1;

	/**
	 * Interested in change events
	 */
    export const Change = 2;

	/**
	 * Interested in delete events
	 */
    export const Delete = 4;
}

interface DidChangeWatchedFilesParams {
	/**
	 * The actual file events.
	 */
    changes: FileEvent[];
}

/**
 * An event describing a file change.
 */
interface FileEvent {
	/**
	 * The file's URI.
	 */
    uri: DocumentUri;
	/**
	 * The change type.
	 */
    type: number;
}

/**
 * The file event type.
 */
export namespace FileChangeType {
	/**
	 * The file got created.
	 */
    export const Created = 1;
	/**
	 * The file got changed.
	 */
    export const Changed = 2;
	/**
	 * The file got deleted.
	 */
    export const Deleted = 3;
}

interface WorkspaceSymbolClientCapabilities {
	/**
	 * Symbol request supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * Specific capabilities for the `SymbolKind` in the `workspace/symbol` request.
	 */
    symbolKind?: {
		/**
		 * The symbol kind values the client supports. When this
		 * property exists the client also guarantees that it will
		 * handle values outside its set gracefully and falls back
		 * to a default value when unknown.
		 *
		 * If this property is not present the client only supports
		 * the symbol kinds from `File` to `Array` as defined in
		 * the initial version of the protocol.
		 */
        valueSet?: SymbolKind[];
    }
}

export interface WorkspaceSymbolOptions extends WorkDoneProgressOptions {
}

export interface WorkspaceSymbolRegistrationOptions extends WorkspaceSymbolOptions {
}

/**
 * The parameters of a Workspace Symbol Request.
 */
interface WorkspaceSymbolParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * A query string to filter symbols by. Clients may send an empty
	 * string here to request all symbols.
	 */
    query: string;
}

export interface ExecuteCommandClientCapabilities {
	/**
	 * Execute command supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface ExecuteCommandOptions extends WorkDoneProgressOptions {
	/**
	 * The commands to be executed on the server
	 */
    commands: string[]
}

/**
 * Execute command registration options.
 */
export interface ExecuteCommandRegistrationOptions extends ExecuteCommandOptions {
}

export interface ExecuteCommandParams extends WorkDoneProgressParams {

	/**
	 * The identifier of the actual command handler.
	 */
    command: string;
	/**
	 * Arguments that the command should be invoked with.
	 */
    arguments?: any[];
}

export interface ApplyWorkspaceEditParams {
	/**
	 * An optional label of the workspace edit. This label is
	 * presented in the user interface for example on an undo
	 * stack to undo the workspace edit.
	 */
    label?: string;

	/**
	 * The edits to apply.
	 */
    edit: WorkspaceEdit;
}

export interface ApplyWorkspaceEditResponse {
	/**
	 * Indicates whether the edit was applied or not.
	 */
    applied: boolean;

	/**
	 * An optional textual description for why the edit was not applied.
	 * This may be used may be used by the server for diagnostic
	 * logging or to provide a suitable error for a request that
	 * triggered the edit.
	 */
    failureReason?: string;
}

/**
 * Defines how the host (editor) should sync document changes to the language server.
 */
export namespace TextDocumentSyncKind {
	/**
	 * Documents should not be synced at all.
	 */
    export const None = 0;

	/**
	 * Documents are synced by always sending the full content
	 * of the document.
	 */
    export const Full = 1;

	/**
	 * Documents are synced by sending the full content on open.
	 * After that only incremental updates to the document are
	 * send.
	 */
    export const Incremental = 2;
}

export interface TextDocumentSyncOptions {
	/**
	 * Open and close notifications are sent to the server. If omitted open close notification should not
	 * be sent.
	 */
    openClose?: boolean;
	/**
	 * Change notifications are sent to the server. See TextDocumentSyncKind.None, TextDocumentSyncKind.Full
	 * and TextDocumentSyncKind.Incremental. If omitted it defaults to TextDocumentSyncKind.None.
	 */
    change?: TextDocumentSyncKind;
}

interface DidOpenTextDocumentParams {
	/**
	 * The document that was opened.
	 */
    textDocument: TextDocumentItem;
}

/**
 * Describe options to be used when registering for text document change events.
 */
export interface TextDocumentChangeRegistrationOptions extends TextDocumentRegistrationOptions {
	/**
	 * How documents are synced to the server. See TextDocumentSyncKind.Full
	 * and TextDocumentSyncKind.Incremental.
	 */
    syncKind: TextDocumentSyncKind;
}

interface DidChangeTextDocumentParams {
	/**
	 * The document that did change. The version number points
	 * to the version after all provided content changes have
	 * been applied.
	 */
    textDocument: VersionedTextDocumentIdentifier;

	/**
	 * The actual content changes. The content changes describe single state changes
	 * to the document. So if there are two content changes c1 (at array index 0) and
	 * c2 (at array index 1) for a document in state S then c1 moves the document from
	 * S to S' and c2 from S' to S''. So c1 is computed on the state S and c2 is computed
	 * on the state S'.
	 *
	 * To mirror the content of a document using change events use the following approach:
	 * - start with the same initial content
	 * - apply the 'textDocument/didChange' notifications in the order you recevie them.
	 * - apply the `TextDocumentContentChangeEvent`s in a single notification in the order
	 *   you receive them.
	 */
    contentChanges: TextDocumentContentChangeEvent[];
}

/**
 * An event describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 */
export type TextDocumentContentChangeEvent = {
	/**
	 * The range of the document that changed.
	 */
    range: Range;

	/**
	 * The optional length of the range that got replaced.
	 *
	 * @deprecated use range instead.
	 */
    rangeLength?: number;

	/**
	 * The new text for the provided range.
	 */
    text: string;
} | {
	/**
	 * The new text of the whole document.
	 */
    text: string;
}

/**
 * The parameters send in a will save text document notification.
 */
export interface WillSaveTextDocumentParams {
	/**
	 * The document that will be saved.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The 'TextDocumentSaveReason'.
	 */
    reason: number;
}

/**
 * Represents reasons why a text document is saved.
 */
export namespace TextDocumentSaveReason {

	/**
	 * Manually triggered, e.g. by the user pressing save, by starting debugging,
	 * or by an API call.
	 */
    export const Manual = 1;

	/**
	 * Automatic after a delay.
	 */
    export const AfterDelay = 2;

	/**
	 * When the editor lost focus.
	 */
    export const FocusOut = 3;
}

export interface SaveOptions {
	/**
	 * The client is supposed to include the content on save.
	 */
    includeText?: boolean;
}

export interface TextDocumentSaveRegistrationOptions extends TextDocumentRegistrationOptions {
	/**
	 * The client is supposed to include the content on save.
	 */
    includeText?: boolean;
}

interface DidSaveTextDocumentParams {
	/**
	 * The document that was saved.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * Optional the content when saved. Depends on the includeText value
	 * when the save notification was requested.
	 */
    text?: string;
}

interface DidCloseTextDocumentParams {
	/**
	 * The document that was closed.
	 */
    textDocument: TextDocumentIdentifier;
}

export interface TextDocumentSyncClientCapabilities {
	/**
	 * Whether text document synchronization supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports sending will save notifications.
	 */
    willSave?: boolean;

	/**
	 * The client supports sending a will save request and
	 * waits for a response providing text edits which will
	 * be applied to the document before it is saved.
	 */
    willSaveWaitUntil?: boolean;

	/**
	 * The client supports did save notifications.
	 */
    didSave?: boolean;
}

/**
 * Defines how the host (editor) should sync document changes to the language server.
 */
export namespace TextDocumentSyncKind {
	/**
	 * Documents should not be synced at all.
	 */
    export const None = 0;

	/**
	 * Documents are synced by always sending the full content
	 * of the document.
	 */
    export const Full = 1;

	/**
	 * Documents are synced by sending the full content on open.
	 * After that only incremental updates to the document are
	 * send.
	 */
    export const Incremental = 2;
}

export interface TextDocumentSyncOptions {
	/**
	 * Open and close notifications are sent to the server. If omitted open close notification should not
	 * be sent.
	 */
    openClose?: boolean;
	/**
	 * Change notifications are sent to the server. See TextDocumentSyncKind.None, TextDocumentSyncKind.Full
	 * and TextDocumentSyncKind.Incremental. If omitted it defaults to TextDocumentSyncKind.None.
	 */
    change?: number;
	/**
	 * If present will save notifications are sent to the server. If omitted the notification should not be
	 * sent.
	 */
    willSave?: boolean;
	/**
	 * If present will save wait until requests are sent to the server. If omitted the request should not be
	 * sent.
	 */
    willSaveWaitUntil?: boolean;
	/**
	 * If present save notifications are sent to the server. If omitted the notification should not be
	 * sent.
	 */
    save?: SaveOptions;
}

export interface PublishDiagnosticsClientCapabilities {
	/**
	 * Whether the clients accepts diagnostics with related information.
	 */
    relatedInformation?: boolean;

	/**
	 * Client supports the tag property to provide meta data about a diagnostic.
	 * Clients supporting tags have to handle unknown tags gracefully.
	 *
	 * @since 3.15.0
	 */
    tagSupport?: {
		/**
		 * The tags supported by the client.
		 */
        valueSet: DiagnosticTag[];
    };

	/**
	 * Whether the client interprets the version property of the
	 * `textDocument/publishDiagnostics` notification's parameter.
	 *
	 * @since 3.15.0
	 */
    versionSupport?: boolean;
}

interface PublishDiagnosticsParams {
	/**
	 * The URI for which diagnostic information is reported.
	 */
    uri: DocumentUri;

	/**
	 * Optional the version number of the document the diagnostics are published for.
	 *
	 * @since 3.15.0
	 */
    version?: number;

	/**
	 * An array of diagnostic information items.
	 */
    diagnostics: Diagnostic[];
}

export interface CompletionClientCapabilities {
	/**
	 * Whether completion supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports the following `CompletionItem` specific
	 * capabilities.
	 */
    completionItem?: {
		/**
		 * Client supports snippets as insert text.
		 *
		 * A snippet can define tab stops and placeholders with `$1`, `$2`
		 * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
		 * the end of the snippet. Placeholders with equal identifiers are linked,
		 * that is typing in one will update others too.
		 */
        snippetSupport?: boolean;

		/**
		 * Client supports commit characters on a completion item.
		 */
        commitCharactersSupport?: boolean

		/**
		 * Client supports the follow content formats for the documentation
		 * property. The order describes the preferred format of the client.
		 */
        documentationFormat?: MarkupKind[];

		/**
		 * Client supports the deprecated property on a completion item.
		 */
        deprecatedSupport?: boolean;

		/**
		 * Client supports the preselect property on a completion item.
		 */
        preselectSupport?: boolean;

		/**
		 * Client supports the tag property on a completion item. Clients supporting
		 * tags have to handle unknown tags gracefully. Clients especially need to
		 * preserve unknown tags when sending a completion item back to the server in
		 * a resolve call.
		 *
		 * @since 3.15.0
		 */
        tagSupport?: {
			/**
			 * The tags supported by the client.
			 */
            valueSet: CompletionItemTag[]
        }
    };

    completionItemKind?: {
		/**
		 * The completion item kind values the client supports. When this
		 * property exists the client also guarantees that it will
		 * handle values outside its set gracefully and falls back
		 * to a default value when unknown.
		 *
		 * If this property is not present the client only supports
		 * the completion items kinds from `Text` to `Reference` as defined in
		 * the initial version of the protocol.
		 */
        valueSet?: CompletionItemKind[];
    };

	/**
	 * The client supports to send additional context information for a
	 * `textDocument/completion` request.
	 */
    contextSupport?: boolean;
}

/**
 * Completion options.
 */
export interface CompletionOptions extends WorkDoneProgressOptions {
	/**
	 * Most tools trigger completion request automatically without explicitly requesting
	 * it using a keyboard shortcut (e.g. Ctrl+Space). Typically they do so when the user
	 * starts to type an identifier. For example if the user types `c` in a JavaScript file
	 * code complete will automatically pop up present `console` besides others as a
	 * completion item. Characters that make up identifiers don't need to be listed here.
	 *
	 * If code complete should automatically be trigger on characters not being valid inside
	 * an identifier (for example `.` in JavaScript) list them in `triggerCharacters`.
	 */
    triggerCharacters?: string[];

	/**
	 * The list of all possible characters that commit a completion. This field can be used
	 * if clients don't support individual commit characters per completion item. See
	 * `ClientCapabilities.textDocument.completion.completionItem.commitCharactersSupport`.
	 *
	 * If a server provides both `allCommitCharacters` and commit characters on an individual
	 * completion item the ones on the completion item win.
	 *
	 * @since 3.2.0
	 */
    allCommitCharacters?: string[];

	/**
	 * The server provides support to resolve additional
	 * information for a completion item.
	 */
    resolveProvider?: boolean;
}

export interface CompletionRegistrationOptions extends TextDocumentRegistrationOptions, CompletionOptions {
}

export interface CompletionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
	/**
	 * The completion context. This is only available if the client specifies
	 * to send this using `ClientCapabilities.textDocument.completion.contextSupport === true`
	 */
    context?: CompletionContext;
}

/**
 * How a completion was triggered
 */
export namespace CompletionTriggerKind {
	/**
	 * Completion was triggered by typing an identifier (24x7 code
	 * complete), manual invocation (e.g Ctrl+Space) or via API.
	 */
    export const Invoked: 1 = 1;

	/**
	 * Completion was triggered by a trigger character specified by
	 * the `triggerCharacters` properties of the `CompletionRegistrationOptions`.
	 */
    export const TriggerCharacter: 2 = 2;

	/**
	 * Completion was re-triggered as the current completion list is incomplete.
	 */
    export const TriggerForIncompleteCompletions: 3 = 3;
}
export type CompletionTriggerKind = 1 | 2 | 3;


/**
 * Contains additional information about the context in which a completion request is triggered.
 */
export interface CompletionContext {
	/**
	 * How the completion was triggered.
	 */
    triggerKind: CompletionTriggerKind;

	/**
	 * The trigger character (a single character) that has trigger code complete.
	 * Is undefined if `triggerKind !== CompletionTriggerKind.TriggerCharacter`
	 */
    triggerCharacter?: string;
}

/**
 * Represents a collection of [completion items](#CompletionItem) to be presented
 * in the editor.
 */
export interface CompletionList {
	/**
	 * This list it not complete. Further typing should result in recomputing
	 * this list.
	 */
    isIncomplete: boolean;

	/**
	 * The completion items.
	 */
    items: CompletionItem[];
}

/**
 * Defines whether the insert text in a completion item should be interpreted as
 * plain text or a snippet.
 */
export namespace InsertTextFormat {
	/**
	 * The primary text to be inserted is treated as a plain string.
	 */
    export const PlainText = 1;

	/**
	 * The primary text to be inserted is treated as a snippet.
	 *
	 * A snippet can define tab stops and placeholders with `$1`, `$2`
	 * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
	 * the end of the snippet. Placeholders with equal identifiers are linked,
	 * that is typing in one will update others too.
	 */
    export const Snippet = 2;
}

export type InsertTextFormat = 1 | 2;

/**
 * Completion item tags are extra annotations that tweak the rendering of a completion
 * item.
 *
 * @since 3.15.0
 */
export namespace CompletionItemTag {
	/**
	 * Render a completion as obsolete, usually using a strike-out.
	 */
    export const Deprecated = 1;
}

export type CompletionItemTag = 1;

export interface CompletionItem {
	/**
	 * The label of this completion item. By default
	 * also the text that is inserted when selecting
	 * this completion.
	 */
    label: string;

	/**
	 * The kind of this completion item. Based of the kind
	 * an icon is chosen by the editor. The standardized set
	 * of available values is defined in `CompletionItemKind`.
	 */
    kind?: number;

	/**
	 * Tags for this completion item.
	 *
	 * @since 3.15.0
	 */
    tags?: CompletionItemTag[];

	/**
	 * A human-readable string with additional information
	 * about this item, like type or symbol information.
	 */
    detail?: string;

	/**
	 * A human-readable string that represents a doc-comment.
	 */
    documentation?: string | MarkupContent;

	/**
	 * Indicates if this item is deprecated.
	 *
	 * @deprecated Use `tags` instead if supported.
	 */
    deprecated?: boolean;

	/**
	 * Select this item when showing.
	 *
	 * *Note* that only one completion item can be selected and that the
	 * tool / client decides which item that is. The rule is that the *first*
	 * item of those that match best is selected.
	 */
    preselect?: boolean;

	/**
	 * A string that should be used when comparing this item
	 * with other items. When `falsy` the label is used.
	 */
    sortText?: string;

	/**
	 * A string that should be used when filtering a set of
	 * completion items. When `falsy` the label is used.
	 */
    filterText?: string;

	/**
	 * A string that should be inserted into a document when selecting
	 * this completion. When `falsy` the label is used.
	 *
	 * The `insertText` is subject to interpretation by the client side.
	 * Some tools might not take the string literally. For example
	 * VS Code when code complete is requested in this example `con<cursor position>`
	 * and a completion item with an `insertText` of `console` is provided it
	 * will only insert `sole`. Therefore it is recommended to use `textEdit` instead
	 * since it avoids additional client side interpretation.
	 */
    insertText?: string;

	/**
	 * The format of the insert text. The format applies to both the `insertText` property
	 * and the `newText` property of a provided `textEdit`. If omitted defaults to
	 * `InsertTextFormat.PlainText`.
	 */
    insertTextFormat?: InsertTextFormat;

	/**
	 * An edit which is applied to a document when selecting this completion. When an edit is provided the value of
	 * `insertText` is ignored.
	 *
	 * *Note:* The range of the edit must be a single line range and it must contain the position at which completion
	 * has been requested.
	 */
    textEdit?: TextEdit;

	/**
	 * An optional array of additional text edits that are applied when
	 * selecting this completion. Edits must not overlap (including the same insert position)
	 * with the main edit nor with themselves.
	 *
	 * Additional text edits should be used to change text unrelated to the current cursor position
	 * (for example adding an import statement at the top of the file if the completion item will
	 * insert an unqualified type).
	 */
    additionalTextEdits?: TextEdit[];

	/**
	 * An optional set of characters that when pressed while this completion is active will accept it first and
	 * then type that character. *Note* that all commit characters should have `length=1` and that superfluous
	 * characters will be ignored.
	 */
    commitCharacters?: string[];

	/**
	 * An optional command that is executed *after* inserting this completion. *Note* that
	 * additional modifications to the current document should be described with the
	 * additionalTextEdits-property.
	 */
    command?: Command;

	/**
	 * A data entry field that is preserved on a completion item between
	 * a completion and a completion resolve request.
	 */
    data?: any
}

/**
 * The kind of a completion entry.
 */
export namespace CompletionItemKind {
    export const Text = 1;
    export const Method = 2;
    export const Function = 3;
    export const Constructor = 4;
    export const Field = 5;
    export const Variable = 6;
    export const Class = 7;
    export const Interface = 8;
    export const Module = 9;
    export const Property = 10;
    export const Unit = 11;
    export const Value = 12;
    export const Enum = 13;
    export const Keyword = 14;
    export const Snippet = 15;
    export const Color = 16;
    export const File = 17;
    export const Reference = 18;
    export const Folder = 19;
    export const EnumMember = 20;
    export const Constant = 21;
    export const Struct = 22;
    export const Event = 23;
    export const Operator = 24;
    export const TypeParameter = 25;
}

export interface HoverClientCapabilities {
	/**
	 * Whether hover supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * Client supports the follow content formats for the content
	 * property. The order describes the preferred format of the client.
	 */
    contentFormat?: MarkupKind[];
}

export interface HoverOptions extends WorkDoneProgressOptions {
}

export interface HoverRegistrationOptions extends TextDocumentRegistrationOptions, HoverOptions {
}

export interface HoverParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}

/**
 * The result of a hover request.
 */
export interface Hover {
	/**
	 * The hover's content
	 */
    contents: MarkedString | MarkedString[] | MarkupContent;

	/**
	 * An optional range is a range inside a text document
	 * that is used to visualize a hover, e.g. by changing the background color.
	 */
    range?: Range;
}

/**
 * MarkedString can be used to render human readable text. It is either a markdown string
 * or a code-block that provides a language and a code snippet. The language identifier
 * is semantically equal to the optional language identifier in fenced code blocks in GitHub
 * issues. See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * The pair of a language and a value is an equivalent to markdown:
 * ```${language}
 * ${value}
 * ```
 *
 * Note that markdown strings will be sanitized - that means html will be escaped.
* @deprecated use MarkupContent instead.
*/
type MarkedString = string | { language: string; value: string };

export interface SignatureHelpClientCapabilities {
	/**
	 * Whether signature help supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports the following `SignatureInformation`
	 * specific properties.
	 */
    signatureInformation?: {
		/**
		 * Client supports the follow content formats for the documentation
		 * property. The order describes the preferred format of the client.
		 */
        documentationFormat?: MarkupKind[];

		/**
		 * Client capabilities specific to parameter information.
		 */
        parameterInformation?: {
			/**
			 * The client supports processing label offsets instead of a
			 * simple label string.
			 *
			 * @since 3.14.0
			 */
            labelOffsetSupport?: boolean;
        };
    };

	/**
	 * The client supports to send additional context information for a
	 * `textDocument/signatureHelp` request. A client that opts into
	 * contextSupport will also support the `retriggerCharacters` on
	 * `SignatureHelpOptions`.
	 *
	 * @since 3.15.0
	 */
    contextSupport?: boolean;
}

export interface SignatureHelpOptions extends WorkDoneProgressOptions {
	/**
	 * The characters that trigger signature help
	 * automatically.
	 */
    triggerCharacters?: string[];

	/**
	 * List of characters that re-trigger signature help.
	 *
	 * These trigger characters are only active when signature help is already showing. All trigger characters
	 * are also counted as re-trigger characters.
	 *
	 * @since 3.15.0
	 */
    retriggerCharacters?: string[];
}

export interface SignatureHelpRegistrationOptions extends TextDocumentRegistrationOptions, SignatureHelpOptions {
}

export interface SignatureHelpParams extends TextDocumentPositionParams, WorkDoneProgressParams {
	/**
	 * The signature help context. This is only available if the client specifies
	 * to send this using the client capability  `textDocument.signatureHelp.contextSupport === true`
	 *
	 * @since 3.15.0
	 */
    context?: SignatureHelpContext;
}

/**
 * How a signature help was triggered.
 *
 * @since 3.15.0
 */
export namespace SignatureHelpTriggerKind {
	/**
	 * Signature help was invoked manually by the user or by a command.
	 */
    export const Invoked: 1 = 1;
	/**
	 * Signature help was triggered by a trigger character.
	 */
    export const TriggerCharacter: 2 = 2;
	/**
	 * Signature help was triggered by the cursor moving or by the document content changing.
	 */
    export const ContentChange: 3 = 3;
}
export type SignatureHelpTriggerKind = 1 | 2 | 3;

/**
 * Additional information about the context in which a signature help request was triggered.
 *
 * @since 3.15.0
 */
export interface SignatureHelpContext {
	/**
	 * Action that caused signature help to be triggered.
	 */
    triggerKind: SignatureHelpTriggerKind;

	/**
	 * Character that caused signature help to be triggered.
	 *
	 * This is undefined when `triggerKind !== SignatureHelpTriggerKind.TriggerCharacter`
	 */
    triggerCharacter?: string;

	/**
	 * `true` if signature help was already showing when it was triggered.
	 *
	 * Retriggers occur when the signature help is already active and can be caused by actions such as
	 * typing a trigger character, a cursor move, or document content changes.
	 */
    isRetrigger: boolean;

	/**
	 * The currently active `SignatureHelp`.
	 *
	 * The `activeSignatureHelp` has its `SignatureHelp.activeSignature` field updated based on
	 * the user navigating through available signatures.
	 */
    activeSignatureHelp?: SignatureHelp;
}

/**
 * Signature help represents the signature of something
 * callable. There can be multiple signature but only one
 * active and only one active parameter.
 */
export interface SignatureHelp {
	/**
	 * One or more signatures.
	 */
    signatures: SignatureInformation[];

	/**
	 * The active signature. If omitted or the value lies outside the
	 * range of `signatures` the value defaults to zero or is ignored if
	 * `signatures.length === 0`. Whenever possible implementors should
	 * make an active decision about the active signature and shouldn't
	 * rely on a default value.
	 * In future version of the protocol this property might become
	 * mandatory to better express this.
	 */
    activeSignature?: number;

	/**
	 * The active parameter of the active signature. If omitted or the value
	 * lies outside the range of `signatures[activeSignature].parameters`
	 * defaults to 0 if the active signature has parameters. If
	 * the active signature has no parameters it is ignored.
	 * In future version of the protocol this property might become
	 * mandatory to better express the active parameter if the
	 * active signature does have any.
	 */
    activeParameter?: number;
}

/**
 * Represents the signature of something callable. A signature
 * can have a label, like a function-name, a doc-comment, and
 * a set of parameters.
 */
export interface SignatureInformation {
	/**
	 * The label of this signature. Will be shown in
	 * the UI.
	 */
    label: string;

	/**
	 * The human-readable doc-comment of this signature. Will be shown
	 * in the UI but can be omitted.
	 */
    documentation?: string | MarkupContent;

	/**
	 * The parameters of this signature.
	 */
    parameters?: ParameterInformation[];
}

/**
 * Represents a parameter of a callable-signature. A parameter can
 * have a label and a doc-comment.
 */
export interface ParameterInformation {

	/**
	 * The label of this parameter information.
	 *
	 * Either a string or an inclusive start and exclusive end offsets within its containing
	 * signature label. (see SignatureInformation.label). The offsets are based on a UTF-16
	 * string representation as `Position` and `Range` does.
	 *
	 * *Note*: a label of type string should be a substring of its containing signature label.
	 * Its intended use case is to highlight the parameter label part in the `SignatureInformation.label`.
	 */
    label: string | [number, number];

	/**
	 * The human-readable doc-comment of this parameter. Will be shown
	 * in the UI but can be omitted.
	 */
    documentation?: string | MarkupContent;
}

export interface DeclarationClientCapabilities {
	/**
	 * Whether declaration supports dynamic registration. If this is set to `true`
	 * the client supports the new `DeclarationRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of declaration links.
	 */
    linkSupport?: boolean;
}

export interface DeclarationOptions extends WorkDoneProgressOptions {
}

export interface DeclarationRegistrationOptions extends DeclarationOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}

export interface DeclarationParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

export interface DefinitionClientCapabilities {
	/**
	 * Whether definition supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of definition links.
	 *
	 * @since 3.14.0
	 */
    linkSupport?: boolean;
}

export interface DefinitionOptions extends WorkDoneProgressOptions {
}

export interface DefinitionRegistrationOptions extends TextDocumentRegistrationOptions, DefinitionOptions {
}

export interface DefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

export interface TypeDefinitionClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `TypeDefinitionRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of definition links.
	 *
	 * @since 3.14.0
	 */
    linkSupport?: boolean;
}

export interface TypeDefinitionOptions extends WorkDoneProgressOptions {
}

export interface TypeDefinitionRegistrationOptions extends TextDocumentRegistrationOptions, TypeDefinitionOptions, StaticRegistrationOptions {
}

export interface TypeDefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

export interface ImplementationClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `ImplementationRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of definition links.
	 *
	 * @since 3.14.0
	 */
    linkSupport?: boolean;
}

export interface ImplementationOptions extends WorkDoneProgressOptions {
}

export interface ImplementationRegistrationOptions extends TextDocumentRegistrationOptions, ImplementationOptions, StaticRegistrationOptions {
}

export interface ImplementationParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

export interface ReferenceClientCapabilities {
	/**
	 * Whether references supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface ReferenceOptions extends WorkDoneProgressOptions {
}

export interface ReferenceRegistrationOptions extends TextDocumentRegistrationOptions, ReferenceOptions {
}

export interface ReferenceParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
    context: ReferenceContext
}

export interface ReferenceContext {
	/**
	 * Include the declaration of the current symbol.
	 */
    includeDeclaration: boolean;
}

export interface DocumentHighlightClientCapabilities {
	/**
	 * Whether document highlight supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface DocumentHighlightOptions extends WorkDoneProgressOptions {
}

export interface DocumentHighlightRegistrationOptions extends TextDocumentRegistrationOptions, DocumentHighlightOptions {
}

export interface DocumentHighlightParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

/**
 * A document highlight is a range inside a text document which deserves
 * special attention. Usually a document highlight is visualized by changing
 * the background color of its range.
 *
 */
export interface DocumentHighlight {
	/**
	 * The range this highlight applies to.
	 */
    range: Range;

	/**
	 * The highlight kind, default is DocumentHighlightKind.Text.
	 */
    kind?: number;
}

/**
 * A document highlight kind.
 */
export namespace DocumentHighlightKind {
	/**
	 * A textual occurrence.
	 */
    export const Text = 1;

	/**
	 * Read-access of a symbol, like reading a variable.
	 */
    export const Read = 2;

	/**
	 * Write-access of a symbol, like writing to a variable.
	 */
    export const Write = 3;
}

export interface DocumentSymbolClientCapabilities {
	/**
	 * Whether document symbol supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * Specific capabilities for the `SymbolKind` in the `textDocument/documentSymbol` request.
	 */
    symbolKind?: {
		/**
		 * The symbol kind values the client supports. When this
		 * property exists the client also guarantees that it will
		 * handle values outside its set gracefully and falls back
		 * to a default value when unknown.
		 *
		 * If this property is not present the client only supports
		 * the symbol kinds from `File` to `Array` as defined in
		 * the initial version of the protocol.
		 */
        valueSet?: SymbolKind[];
    }

	/**
	 * The client supports hierarchical document symbols.
	 */
    hierarchicalDocumentSymbolSupport?: boolean;
}

export interface DocumentSymbolOptions extends WorkDoneProgressOptions {
}

export interface DocumentSymbolRegistrationOptions extends TextDocumentRegistrationOptions, DocumentSymbolOptions {
}

export interface DocumentSymbolParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;
}

/**
 * A symbol kind.
 */
export namespace SymbolKind {
    export const File = 1;
    export const Module = 2;
    export const Namespace = 3;
    export const Package = 4;
    export const Class = 5;
    export const Method = 6;
    export const Property = 7;
    export const Field = 8;
    export const Constructor = 9;
    export const Enum = 10;
    export const Interface = 11;
    export const Function = 12;
    export const Variable = 13;
    export const Constant = 14;
    export const String = 15;
    export const Number = 16;
    export const Boolean = 17;
    export const Array = 18;
    export const Object = 19;
    export const Key = 20;
    export const Null = 21;
    export const EnumMember = 22;
    export const Struct = 23;
    export const Event = 24;
    export const Operator = 25;
    export const TypeParameter = 26;
}

/**
 * Represents programming constructs like variables, classes, interfaces etc. that appear in a document. Document symbols can be
 * hierarchical and they have two ranges: one that encloses its definition and one that points to its most interesting range,
 * e.g. the range of an identifier.
 */
export interface DocumentSymbol {

	/**
	 * The name of this symbol. Will be displayed in the user interface and therefore must not be
	 * an empty string or a string only consisting of white spaces.
	 */
    name: string;

	/**
	 * More detail for this symbol, e.g the signature of a function.
	 */
    detail?: string;

	/**
	 * The kind of this symbol.
	 */
    kind: SymbolKind;

	/**
	 * Indicates if this symbol is deprecated.
	 */
    deprecated?: boolean;

	/**
	 * The range enclosing this symbol not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to determine if the clients cursor is
	 * inside the symbol to reveal in the symbol in the UI.
	 */
    range: Range;

	/**
	 * The range that should be selected and revealed when this symbol is being picked, e.g the name of a function.
	 * Must be contained by the `range`.
	 */
    selectionRange: Range;

	/**
	 * Children of this symbol, e.g. properties of a class.
	 */
    children?: DocumentSymbol[];
}

/**
 * Represents information about programming constructs like variables, classes,
 * interfaces etc.
 */
export interface SymbolInformation {
	/**
	 * The name of this symbol.
	 */
    name: string;

	/**
	 * The kind of this symbol.
	 */
    kind: SymbolKind;

	/**
	 * Indicates if this symbol is deprecated.
	 */
    deprecated?: boolean;

	/**
	 * The location of this symbol. The location's range is used by a tool
	 * to reveal the location in the editor. If the symbol is selected in the
	 * tool the range's start information is used to position the cursor. So
	 * the range usually spans more then the actual symbol's name and does
	 * normally include things like visibility modifiers.
	 *
	 * The range doesn't have to denote a node range in the sense of a abstract
	 * syntax tree. It can therefore not be used to re-construct a hierarchy of
	 * the symbols.
	 */
    location: Location;

	/**
	 * The name of the symbol containing this symbol. This information is for
	 * user interface purposes (e.g. to render a qualifier in the user interface
	 * if necessary). It can't be used to re-infer a hierarchy for the document
	 * symbols.
	 */
    containerName?: string;
}

export interface CodeActionClientCapabilities {
	/**
	 * Whether code action supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * The client supports code action literals as a valid
	 * response of the `textDocument/codeAction` request.
	 *
	 * @since 3.8.0
	 */
    codeActionLiteralSupport?: {
		/**
		 * The code action kind is supported with the following value
		 * set.
		 */
        codeActionKind: {

			/**
			 * The code action kind values the client supports. When this
			 * property exists the client also guarantees that it will
			 * handle values outside its set gracefully and falls back
			 * to a default value when unknown.
			 */
            valueSet: CodeActionKind[];
        };
    };

	/**
	 * Whether code action supports the `isPreferred` property.
	 * @since 3.15.0
	 */
    isPreferredSupport?: boolean;
}

export interface CodeActionOptions extends WorkDoneProgressOptions {
	/**
	 * CodeActionKinds that this server may return.
	 *
	 * The list of kinds may be generic, such as `CodeActionKind.Refactor`, or the server
	 * may list out every specific kind they provide.
	 */
    codeActionKinds?: CodeActionKind[];
}

export interface CodeActionRegistrationOptions extends TextDocumentRegistrationOptions, CodeActionOptions {
}

/**
 * Params for the CodeActionRequest
 */
export interface CodeActionParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The document in which the command was invoked.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The range for which the command was invoked.
	 */
    range: Range;

	/**
	 * Context carrying additional information.
	 */
    context: CodeActionContext;
}

/**
 * The kind of a code action.
 *
 * Kinds are a hierarchical list of identifiers separated by `.`, e.g. `"refactor.extract.function"`.
 *
 * The set of kinds is open and client needs to announce the kinds it supports to the server during
 * initialization.
 */
export type CodeActionKind = string;

/**
 * A set of predefined code action kinds.
 */
export namespace CodeActionKind {

	/**
	 * Empty kind.
	 */
    export const Empty: CodeActionKind = '';

	/**
	 * Base kind for quickfix actions: 'quickfix'.
	 */
    export const QuickFix: CodeActionKind = 'quickfix';

	/**
	 * Base kind for refactoring actions: 'refactor'.
	 */
    export const Refactor: CodeActionKind = 'refactor';

	/**
	 * Base kind for refactoring extraction actions: 'refactor.extract'.
	 *
	 * Example extract actions:
	 *
	 * - Extract method
	 * - Extract function
	 * - Extract variable
	 * - Extract interface from class
	 * - ...
	 */
    export const RefactorExtract: CodeActionKind = 'refactor.extract';

	/**
	 * Base kind for refactoring inline actions: 'refactor.inline'.
	 *
	 * Example inline actions:
	 *
	 * - Inline function
	 * - Inline variable
	 * - Inline constant
	 * - ...
	 */
    export const RefactorInline: CodeActionKind = 'refactor.inline';

	/**
	 * Base kind for refactoring rewrite actions: 'refactor.rewrite'.
	 *
	 * Example rewrite actions:
	 *
	 * - Convert JavaScript function to class
	 * - Add or remove parameter
	 * - Encapsulate field
	 * - Make method static
	 * - Move method to base class
	 * - ...
	 */
    export const RefactorRewrite: CodeActionKind = 'refactor.rewrite';

	/**
	 * Base kind for source actions: `source`.
	 *
	 * Source code actions apply to the entire file.
	 */
    export const Source: CodeActionKind = 'source';

	/**
	 * Base kind for an organize imports source action: `source.organizeImports`.
	 */
    export const SourceOrganizeImports: CodeActionKind = 'source.organizeImports';
}

/**
 * Contains additional diagnostic information about the context in which
 * a code action is run.
 */
export interface CodeActionContext {
	/**
	 * An array of diagnostics known on the client side overlapping the range provided to the
	 * `textDocument/codeAction` request. They are provided so that the server knows which
	 * errors are currently presented to the user for the given range. There is no guarantee
	 * that these accurately reflect the error state of the resource. The primary parameter
	 * to compute code actions is the provided range.
	 */
    diagnostics: Diagnostic[];

	/**
	 * Requested kind of actions to return.
	 *
	 * Actions not of this kind are filtered out by the client before being shown. So servers
	 * can omit computing them.
	 */
    only?: CodeActionKind[];
}

/**
 * A code action represents a change that can be performed in code, e.g. to fix a problem or
 * to refactor code.
 *
 * A CodeAction must set either `edit` and/or a `command`. If both are supplied, the `edit` is applied first, then the `command` is executed.
 */
export interface CodeAction {

	/**
	 * A short, human-readable, title for this code action.
	 */
    title: string;

	/**
	 * The kind of the code action.
	 *
	 * Used to filter code actions.
	 */
    kind?: CodeActionKind;

	/**
	 * The diagnostics that this code action resolves.
	 */
    diagnostics?: Diagnostic[];

	/**
	 * Marks this as a preferred action. Preferred actions are used by the `auto fix` command and can be targeted
	 * by keybindings.
	 *
	 * A quick fix should be marked preferred if it properly addresses the underlying error.
	 * A refactoring should be marked preferred if it is the most reasonable choice of actions to take.
	 *
	 * @since 3.15.0
	 */
    isPreferred?: boolean;

	/**
	 * The workspace edit this code action performs.
	 */
    edit?: WorkspaceEdit;

	/**
	 * A command this code action executes. If a code action
	 * provides an edit and a command, first the edit is
	 * executed and then the command.
	 */
    command?: Command;
}

export interface CodeLensClientCapabilities {
	/**
	 * Whether code lens supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface CodeLensOptions extends WorkDoneProgressOptions {
	/**
	 * Code lens has a resolve provider as well.
	 */
    resolveProvider?: boolean;
}

export interface CodeLensRegistrationOptions extends TextDocumentRegistrationOptions, CodeLensOptions {
}

interface CodeLensParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The document to request code lens for.
	 */
    textDocument: TextDocumentIdentifier;
}

/**
 * A code lens represents a command that should be shown along with
 * source text, like the number of references, a way to run tests, etc.
 *
 * A code lens is _unresolved_ when no command is associated to it. For performance
 * reasons the creation of a code lens and resolving should be done in two stages.
 */
interface CodeLens {
	/**
	 * The range in which this code lens is valid. Should only span a single line.
	 */
    range: Range;

	/**
	 * The command this code lens represents.
	 */
    command?: Command;

	/**
	 * A data entry field that is preserved on a code lens item between
	 * a code lens and a code lens resolve request.
	 */
    data?: any
}

export interface DocumentLinkClientCapabilities {
	/**
	 * Whether document link supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * Whether the client supports the `tooltip` property on `DocumentLink`.
	 *
	 * @since 3.15.0
	 */
    tooltipSupport?: boolean;
}

export interface DocumentLinkOptions extends WorkDoneProgressOptions {
	/**
	 * Document links have a resolve provider as well.
	 */
    resolveProvider?: boolean;
}

export interface DocumentLinkRegistrationOptions extends TextDocumentRegistrationOptions, DocumentLinkOptions {
}

interface DocumentLinkParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The document to provide document links for.
	 */
    textDocument: TextDocumentIdentifier;
}

/**
 * A document link is a range in a text document that links to an internal or external resource, like another
 * text document or a web site.
 */
interface DocumentLink {
	/**
	 * The range this link applies to.
	 */
    range: Range;

	/**
	 * The uri this link points to. If missing a resolve request is sent later.
	 */
    target?: DocumentUri;

	/**
	 * The tooltip text when you hover over this link.
	 *
	 * If a tooltip is provided, is will be displayed in a string that includes instructions on how to
	 * trigger the link, such as `{0} (ctrl + click)`. The specific instructions vary depending on OS,
	 * user settings, and localization.
	 *
	 * @since 3.15.0
	 */
    tooltip?: string;

	/**
	 * A data entry field that is preserved on a document link between a
	 * DocumentLinkRequest and a DocumentLinkResolveRequest.
	 */
    data?: any;
}

export interface DocumentColorClientCapabilities {
	/**
	 * Whether document color supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface DocumentColorOptions extends WorkDoneProgressOptions {
}

export interface DocumentColorRegistrationOptions extends TextDocumentRegistrationOptions, StaticRegistrationOptions, DocumentColorOptions {
}

interface DocumentColorParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;
}

interface ColorInformation {
	/**
	 * The range in the document where this color appears.
	 */
    range: Range;

	/**
	 * The actual color value for this color range.
	 */
    color: Color;
}

/**
 * Represents a color in RGBA space.
 */
interface Color {

	/**
	 * The red component of this color in the range [0-1].
	 */
    readonly red: number;

	/**
	 * The green component of this color in the range [0-1].
	 */
    readonly green: number;

	/**
	 * The blue component of this color in the range [0-1].
	 */
    readonly blue: number;

	/**
	 * The alpha component of this color in the range [0-1].
	 */
    readonly alpha: number;
}

interface ColorPresentationParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The color information to request presentations for.
	 */
    color: Color;

	/**
	 * The range where the color would be inserted. Serves as a context.
	 */
    range: Range;
}

interface ColorPresentation {
	/**
	 * The label of this color presentation. It will be shown on the color
	 * picker header. By default this is also the text that is inserted when selecting
	 * this color presentation.
	 */
    label: string;
	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this presentation for the color.  When `falsy` the [label](#ColorPresentation.label)
	 * is used.
	 */
    textEdit?: TextEdit;
	/**
	 * An optional array of additional [text edits](#TextEdit) that are applied when
	 * selecting this color presentation. Edits must not overlap with the main [edit](#ColorPresentation.textEdit) nor with themselves.
	 */
    additionalTextEdits?: TextEdit[];
}

export interface DocumentFormattingClientCapabilities {
	/**
	 * Whether formatting supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface DocumentFormattingOptions extends WorkDoneProgressOptions {
}

export interface DocumentFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentFormattingOptions {
}

interface DocumentFormattingParams extends WorkDoneProgressParams {
	/**
	 * The document to format.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The format options.
	 */
    options: FormattingOptions;
}

/**
 * Value-object describing what options formatting should use.
 */
interface FormattingOptions {
	/**
	 * Size of a tab in spaces.
	 */
    tabSize: number;

	/**
	 * Prefer spaces over tabs.
	 */
    insertSpaces: boolean;

	/**
	 * Trim trailing whitespace on a line.
	 *
	 * @since 3.15.0
	 */
    trimTrailingWhitespace?: boolean;

	/**
	 * Insert a newline character at the end of the file if one does not exist.
	 *
	 * @since 3.15.0
	 */
    insertFinalNewline?: boolean;

	/**
	 * Trim all newlines after the final newline at the end of the file.
	 *
	 * @since 3.15.0
	 */
    trimFinalNewlines?: boolean;

	/**
	 * Signature for further properties.
	 */
    [key: string]: boolean | number | string;
}

export interface DocumentRangeFormattingClientCapabilities {
	/**
	 * Whether formatting supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface DocumentRangeFormattingOptions extends WorkDoneProgressOptions {
}

export interface DocumentRangeFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentRangeFormattingOptions {
}

interface DocumentRangeFormattingParams extends WorkDoneProgressParams {
	/**
	 * The document to format.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The range to format
	 */
    range: Range;

	/**
	 * The format options
	 */
    options: FormattingOptions;
}

export interface DocumentOnTypeFormattingClientCapabilities {
	/**
	 * Whether on type formatting supports dynamic registration.
	 */
    dynamicRegistration?: boolean;
}

export interface DocumentOnTypeFormattingOptions {
	/**
	 * A character on which formatting should be triggered, like `}`.
	 */
    firstTriggerCharacter: string;

	/**
	 * More trigger characters.
	 */
    moreTriggerCharacter?: string[];
}

export interface DocumentOnTypeFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentOnTypeFormattingOptions {
}

interface DocumentOnTypeFormattingParams {
	/**
	 * The document to format.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The position at which this request was sent.
	 */
    position: Position;

	/**
	 * The character that has been typed.
	 */
    ch: string;

	/**
	 * The format options.
	 */
    options: FormattingOptions;
}

export interface RenameClientCapabilities {
	/**
	 * Whether rename supports dynamic registration.
	 */
    dynamicRegistration?: boolean;

	/**
	 * Client supports testing for validity of rename operations
	 * before execution.
	 *
	 * @since version 3.12.0
	 */
    prepareSupport?: boolean;
}

export interface RenameOptions extends WorkDoneProgressOptions {
	/**
	 * Renames should be checked and tested before being executed.
	 */
    prepareProvider?: boolean;
}

export interface RenameRegistrationOptions extends TextDocumentRegistrationOptions, RenameOptions {
}

interface RenameParams extends WorkDoneProgressParams {
	/**
	 * The document to rename.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The position at which this request was sent.
	 */
    position: Position;

	/**
	 * The new name of the symbol. If the given name is not valid the
	 * request must return a [ResponseError](#ResponseError) with an
	 * appropriate message set.
	 */
    newName: string;
}

export interface FoldingRangeClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration for folding range providers. If this is set to `true`
	 * the client supports the new `FoldingRangeRegistrationOptions` return value for the corresponding server
	 * capability as well.
	 */
    dynamicRegistration?: boolean;
	/**
	 * The maximum number of folding ranges that the client prefers to receive per document. The value serves as a
	 * hint, servers are free to follow the limit.
	 */
    rangeLimit?: number;
	/**
	 * If set, the client signals that it only supports folding complete lines. If set, client will
	 * ignore specified `startCharacter` and `endCharacter` properties in a FoldingRange.
	 */
    lineFoldingOnly?: boolean;
}

export interface FoldingRangeOptions extends WorkDoneProgressOptions {
}

export interface FoldingRangeRegistrationOptions extends TextDocumentRegistrationOptions, FoldingRangeOptions, StaticRegistrationOptions {
}

export interface FoldingRangeParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;
}

/**
 * Enum of known range kinds
 */
export enum FoldingRangeKind {
	/**
	 * Folding range for a comment
	 */
    Comment = 'comment',
	/**
	 * Folding range for a imports or includes
	 */
    Imports = 'imports',
	/**
	 * Folding range for a region (e.g. `#region`)
	 */
    Region = 'region'
}

/**
 * Represents a folding range.
 */
export interface FoldingRange {

	/**
	 * The zero-based line number from where the folded range starts.
	 */
    startLine: number;

	/**
	 * The zero-based character offset from where the folded range starts. If not defined, defaults to the length of the start line.
	 */
    startCharacter?: number;

	/**
	 * The zero-based line number where the folded range ends.
	 */
    endLine: number;

	/**
	 * The zero-based character offset before the folded range ends. If not defined, defaults to the length of the end line.
	 */
    endCharacter?: number;

	/**
	 * Describes the kind of the folding range such as `comment` or `region`. The kind
	 * is used to categorize folding ranges and used by commands like 'Fold all comments'. See
	 * [FoldingRangeKind](#FoldingRangeKind) for an enumeration of standardized kinds.
	 */
    kind?: string;
}

export interface SelectionRangeClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration for selection range providers. If this is set to `true`
	 * the client supports the new `SelectionRangeRegistrationOptions` return value for the corresponding server
	 * capability as well.
	 */
    dynamicRegistration?: boolean;
}

export interface SelectionRangeOptions extends WorkDoneProgressOptions {
}

export interface SelectionRangeRegistrationOptions extends SelectionRangeOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}

export interface SelectionRangeParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
    textDocument: TextDocumentIdentifier;

	/**
	 * The positions inside the text document.
	 */
    positions: Position[];
}

export interface SelectionRange {
    /**
     * The [range](#Range) of this selection range.
     */
    range: Range;
    /**
     * The parent selection range containing this range. Therefore `parent.range` must contain `this.range`.
     */
    parent?: SelectionRange;
}
