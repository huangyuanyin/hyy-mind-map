import type { ViewState } from '../types';
import { ZOOM } from '../constants';
import type { ValidationResult } from './index';

export class ViewValidator {
  /**
   * 验证缩放比例
   */
  static validateScale(
    scale: number,
    minScale: number = ZOOM.MIN_SCALE,
    maxScale: number = ZOOM.MAX_SCALE
  ): ValidationResult {
    if (typeof scale !== 'number' || isNaN(scale)) {
      return {
        valid: false,
        error: 'Scale must be a valid number',
      };
    }

    if (scale < minScale) {
      return {
        valid: false,
        error: `Scale (${scale}) is below minimum (${minScale})`,
      };
    }

    if (scale > maxScale) {
      return {
        valid: false,
        error: `Scale (${scale}) exceeds maximum (${maxScale})`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证平移量
   */
  static validateTranslate(
    translateX: number,
    translateY: number
  ): ValidationResult {
    if (typeof translateX !== 'number' || isNaN(translateX)) {
      return {
        valid: false,
        error: 'TranslateX must be a valid number',
      };
    }

    if (typeof translateY !== 'number' || isNaN(translateY)) {
      return {
        valid: false,
        error: 'TranslateY must be a valid number',
      };
    }

    // 可以添加更多限制，比如最大/最小平移量
    return { valid: true };
  }

  /**
   * 验证视图状态
   */
  static validateViewState(viewState: ViewState): ValidationResult {
    // 验证缩放
    const scaleValidation = this.validateScale(viewState.scale);
    if (!scaleValidation.valid) {
      return scaleValidation;
    }

    // 验证平移
    const translateValidation = this.validateTranslate(
      viewState.translateX,
      viewState.translateY
    );
    if (!translateValidation.valid) {
      return translateValidation;
    }

    return { valid: true };
  }

  /**
   * 验证容器尺寸
   */
  static validateContainerSize(
    width: number,
    height: number
  ): ValidationResult {
    if (typeof width !== 'number' || width <= 0) {
      return {
        valid: false,
        error: 'Container width must be a positive number',
      };
    }

    if (typeof height !== 'number' || height <= 0) {
      return {
        valid: false,
        error: 'Container height must be a positive number',
      };
    }

    return { valid: true };
  }
}
