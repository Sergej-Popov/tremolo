import * as d3 from 'd3';
import { generateId, getSelectedElement, setZoomTransformState, isDebugMode } from './state';
import { setSvgRoot, setGridVisible, toWorkspaceCoords } from './environment';
import { setDebugMode, debugLog, addDebugCross, updateDebugCross } from './debug';
import { hideTooltip, tooltip, debugTooltip } from './tooltip';
import {
    TransformValues,
    defaultTransform,
    computeDecorationMetrics,
    transformPoint,
} from './metrics';
import { linePath, type LinePathDatum } from './paths';
import { adjustStickyFont } from './text';
import { highlightLangs, highlightThemes, type HighlightResult, highlightCode } from './highlight';
import { applyTransform } from './transforms';
import {
    ensureConnectHandles,
    removeConnectHandles,
    updateSelectedColor,
    updateSelectedFrameColor,
    updateSelectedFrameLineStyle,
    updateSelectedAlignment,
    updateSelectedFontSize,
    updateSelectedCodeLang,
    updateSelectedCodeTheme,
    updateSelectedCodeFontSize,
    updateSelectedLineStyle,
    updateSelectedLineColor,
    updateSelectedStartConnectionStyle,
    updateSelectedEndConnectionStyle,
    getSelectedElementData,
    isStickySelected,
    isCodeSelected,
    makeResizable,
    type ElementCopy,
} from './selection';
import { makeDraggable } from './drag';
import { makeCroppable, finishCrop, updateCropOverlay } from './crop';
import {
    BackgroundRemovalOptions,
    BackgroundRemovalResult,
    minBackgroundTolerance,
    maxBackgroundTolerance,
    defaultBackgroundTolerance,
    minBackgroundFeather,
    maxBackgroundFeather,
    defaultBackgroundFeather,
    removeBackgroundFromSelectedImage,
    restoreSelectedImageBackground,
} from './background';
import { applyLineAppearance } from './lines';

function setZoomTransform(transform: d3.ZoomTransform) {
    setZoomTransformState(transform);
    const selected = getSelectedElement();
    if (selected) {
        const data = (selected.datum() as any) || {};
        const currentTransform: TransformValues = data.transform ?? defaultTransform();
        applyTransform(selected, currentTransform);
        const overlay = selected.select('.crop-controls');
        if (!overlay.empty() && overlay.style('display') !== 'none') {
            updateCropOverlay(selected);
        }
    }
}

export {
    generateId,
    setSvgRoot,
    setGridVisible,
    toWorkspaceCoords,
    setDebugMode,
    isDebugMode,
    debugLog,
    hideTooltip,
    tooltip,
    debugTooltip,
    TransformValues,
    defaultTransform,
    computeDecorationMetrics,
    transformPoint,
    linePath,
    LinePathDatum,
    adjustStickyFont,
    highlightLangs,
    highlightThemes,
    HighlightResult,
    highlightCode,
    addDebugCross,
    updateDebugCross,
    applyTransform,
    makeDraggable,
    updateSelectedColor,
    updateSelectedFrameColor,
    updateSelectedFrameLineStyle,
    updateSelectedAlignment,
    updateSelectedFontSize,
    updateSelectedCodeLang,
    updateSelectedCodeTheme,
    updateSelectedCodeFontSize,
    updateSelectedLineStyle,
    updateSelectedLineColor,
    updateSelectedStartConnectionStyle,
    updateSelectedEndConnectionStyle,
    BackgroundRemovalOptions,
    BackgroundRemovalResult,
    minBackgroundTolerance,
    maxBackgroundTolerance,
    defaultBackgroundTolerance,
    minBackgroundFeather,
    maxBackgroundFeather,
    defaultBackgroundFeather,
    removeBackgroundFromSelectedImage,
    restoreSelectedImageBackground,
    applyLineAppearance,
    ElementCopy,
    getSelectedElementData,
    isStickySelected,
    isCodeSelected,
    ensureConnectHandles,
    removeConnectHandles,
    makeResizable,
    makeCroppable,
    setZoomTransform,
};
