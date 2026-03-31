import test from 'node:test';
import assert from 'node:assert/strict';
import { autoLayoutDocument, createStarterDocument, getStartNode } from '../src/lib/graph.ts';

test('autoLayoutDocument keeps the start step as the left entry and avoids card overlap', () => {
  const document = autoLayoutDocument(createStarterDocument());
  const startNode = getStartNode(document);

  assert.ok(startNode);

  const workflowNodes = document.nodes.filter((node) => node.id !== startNode.id);
  assert.ok(workflowNodes.every((node) => node.position.x > startNode.position.x));

  for (let index = 0; index < document.nodes.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < document.nodes.length; compareIndex += 1) {
      const left = document.nodes[index];
      const right = document.nodes[compareIndex];
      const overlapsX = left.position.x < right.position.x + right.size.w && left.position.x + left.size.w > right.position.x;
      const overlapsY = left.position.y < right.position.y + right.size.h && left.position.y + left.size.h > right.position.y;
      assert.equal(overlapsX && overlapsY, false, `Nodes ${left.title} and ${right.title} should not overlap after auto layout.`);
    }
  }
});
