// Copyright (c) jdneo. All rights reserved.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { leetCodeManager } from "../leetCodeManager";
import { Category, defaultProblem, ProblemState } from "../shared";
import { explorerNodeManager } from "./explorerNodeManager";
import { LeetCodeNode } from "./LeetCodeNode";

export class LeetCodeTreeDataProvider implements vscode.TreeDataProvider<LeetCodeNode> {

    private context: vscode.ExtensionContext;

    private onDidChangeTreeDataEvent: vscode.EventEmitter<LeetCodeNode | undefined | null> = new vscode.EventEmitter<LeetCodeNode | undefined | null>();
    // tslint:disable-next-line:member-ordering
    public readonly onDidChangeTreeData: vscode.Event<any> = this.onDidChangeTreeDataEvent.event;

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
    }

    public async refresh(): Promise<void> {
        await explorerNodeManager.refreshCache();
        this.onDidChangeTreeDataEvent.fire();
    }

    public getTreeItem(element: LeetCodeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (element.id === "notSignIn") {
            return {
                label: element.name,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                command: {
                    command: "leetcode.signin",
                    title: "Sign in to LeetCode",
                },
            };
        }

        return {
            label: element.isProblem ? `[${element.id}][${element.difficulty}] ${element.name}` : element.name,
            tooltip: this.getSubCategoryTooltip(element),
            collapsibleState: element.isProblem ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: element.isProblem ? "problem" : element.id.toLowerCase(),
            iconPath: this.parseIconPathFromProblemState(element),
            command: element.isProblem ? element.previewCommand : undefined,
        };
    }

    public getChildren(element?: LeetCodeNode | undefined): vscode.ProviderResult<LeetCodeNode[]> {
        if (!leetCodeManager.getUser()) {
            return [
                new LeetCodeNode(Object.assign({}, defaultProblem, {
                    id: "notSignIn",
                    name: "Sign in to LeetCode",
                }), false),
            ];
        }
        if (!element) { // Root view
            return explorerNodeManager.getRootNodes();
        } else {
            switch (element.id) { // First-level
                case Category.All:
                    return explorerNodeManager.getAllNodes();
                case Category.Favorite:
                    return explorerNodeManager.getFavoriteNodes();
                case Category.Difficulty:
                    return explorerNodeManager.getAllDifficultyNodes();
                case Category.Tag:
                    return explorerNodeManager.getAllTagNodes();
                case Category.Company:
                    return explorerNodeManager.getAllCompanyNodes();
                default:
                    if (element.isProblem) {
                        return [];
                    }
                    return explorerNodeManager.getChildrenNodesById(element.id);
            }
        }
    }

    private parseIconPathFromProblemState(element: LeetCodeNode): string {
        if (!element.isProblem) {
            return "";
        }
        switch (element.state) {
            case ProblemState.AC:
                let difficulty : string = element.difficulty.toLowerCase();
                let png : string = (difficulty === "hard")? "check-red.png":
                                  (difficulty === "medium")? "check-org.png":
                                  (difficulty === "easy")? "check-grn.png":
                                  "check.png";
                return this.context.asAbsolutePath(path.join("resources", png));
            case ProblemState.NotAC:
                return this.context.asAbsolutePath(path.join("resources", "x.png"));
            case ProblemState.Unknown:
                if (element.locked) {
                    return this.context.asAbsolutePath(path.join("resources", "lock.png"));
                }
                return this.context.asAbsolutePath(path.join("resources", "blank.png"));
            default:
                return "";
        }
    }

    private getSubCategoryTooltip(element: LeetCodeNode): string {
        // return '' unless it is a sub-category node
        if (element.isProblem || element.id === "ROOT" || element.id in Category) {
            return "";
        }

        const childernNodes: LeetCodeNode[] = explorerNodeManager.getChildrenNodesById(element.id);

        let acceptedNum: number = 0;
        let failedNum: number = 0;
        for (const node of childernNodes) {
            switch (node.state) {
                case ProblemState.AC:
                    acceptedNum++;
                    break;
                case ProblemState.NotAC:
                    failedNum++;
                    break;
                default:
                    break;
            }
        }

        return [
            `AC: ${acceptedNum}`,
            `Failed: ${failedNum}`,
            `Total: ${childernNodes.length}`,
        ].join(os.EOL);
    }
}

export const leetCodeTreeDataProvider: LeetCodeTreeDataProvider = new LeetCodeTreeDataProvider();
