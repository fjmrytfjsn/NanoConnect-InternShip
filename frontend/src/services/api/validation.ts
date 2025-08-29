/**
 * ランタイム型チェック機能
 * zodを使用したAPI レスポンスの型安全性確保
 */

import { z } from 'zod';
import { ApiResponse, ApiError, PaginatedResponse, Pagination } from '../../../../shared/types/common';

/**
 * 基本スキーマ定義
 */
export const TimestampSchema = z.string().datetime();
export const UserIdSchema = z.string().uuid();
export const PresentationIdSchema = z.string().uuid();
export const SlideIdSchema = z.string().uuid();
export const AccessCodeSchema = z.string().min(6).max(10);

/**
 * エラースキーマ
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
}) satisfies z.ZodType<ApiError>;

/**
 * API レスポンス基本スキーマ
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.union([ApiErrorSchema, z.string()]).optional(),
    message: z.string().optional(),
    timestamp: TimestampSchema.optional(),
  }) satisfies z.ZodType<ApiResponse<z.infer<T>>>;

/**
 * ページネーションスキーマ
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}) satisfies z.ZodType<Pagination>;

/**
 * ページネーション付きレスポンススキーマ
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  ApiResponseSchema(z.array(itemSchema)).extend({
    pagination: PaginationSchema,
  }) satisfies z.ZodType<PaginatedResponse<z.infer<T>>>;

/**
 * 認証関連スキーマ
 */
export const UserInfoSchema = z.object({
  id: UserIdSchema,
  username: z.string().min(3).max(50),
  email: z.string().email(),
  createdAt: TimestampSchema,
});

export const LoginRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const LoginResponseSchema = z.object({
  user: UserInfoSchema,
  token: z.string(),
  expiresIn: z.number().positive(),
});

export const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * プレゼンテーション関連スキーマ
 */
export const PresentationInfoSchema = z.object({
  id: PresentationIdSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  presenterId: UserIdSchema,
  accessCode: AccessCodeSchema,
  isActive: z.boolean(),
  currentSlideIndex: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const CreatePresentationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const CreatePresentationResponseSchema = z.object({
  id: z.string(),
  created: z.boolean(),
  presentation: PresentationInfoSchema,
  accessCode: AccessCodeSchema,
});

/**
 * スライド関連スキーマ
 */
export const SlideTypeSchema = z.enum(['multiple_choice', 'word_cloud']);

export const SlideSettingsSchema = z.object({
  allowMultiple: z.boolean().optional(),
  showResults: z.boolean().optional(),
  maxWords: z.number().int().positive().optional(),
});

export const SlideContentSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string()).min(2).max(10).optional(),
  settings: SlideSettingsSchema.optional(),
});

export const SlideInfoSchema = z.object({
  id: SlideIdSchema,
  presentationId: PresentationIdSchema,
  title: z.string().min(1).max(200),
  type: SlideTypeSchema,
  content: SlideContentSchema,
  order: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const CreateSlideRequestSchema = z.object({
  presentationId: PresentationIdSchema,
  title: z.string().min(1).max(200),
  type: SlideTypeSchema,
  content: SlideContentSchema,
  order: z.number().int().nonnegative(),
});

/**
 * 回答関連スキーマ
 */
export const ResponseDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('multiple_choice'),
    selectedOptions: z.array(z.number().int().nonnegative()),
  }),
  z.object({
    type: z.literal('word_cloud'),
    words: z.array(z.string().min(1).max(50)),
  }),
]);

export const SubmitResponseRequestSchema = z.object({
  slideId: SlideIdSchema,
  responseData: ResponseDataSchema,
});

/**
 * 分析関連スキーマ
 */
export const AnalyticsDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('multiple_choice'),
    optionCounts: z.record(z.string(), z.number().int().nonnegative()),
  }),
  z.object({
    type: z.literal('word_cloud'),
    wordFrequencies: z.record(z.string(), z.number().int().nonnegative()),
  }),
]);

export const SlideAnalyticsSchema = z.object({
  slideId: SlideIdSchema,
  slideTitle: z.string(),
  responseCount: z.number().int().nonnegative(),
  data: AnalyticsDataSchema,
});

export const AnalyticsResponseSchema = z.object({
  presentationId: PresentationIdSchema,
  totalResponses: z.number().int().nonnegative(),
  slideAnalytics: z.array(SlideAnalyticsSchema),
});

/**
 * バリデーション実行関数
 */
export const validateApiResponse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `API レスポンスのバリデーションに失敗しました${context ? ` (${context})` : ''}`;
      const details = {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
        receivedData: data,
      };
      
      console.error(errorMessage, details);
      
      throw new Error(`${errorMessage}: ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
    }
    throw error;
  }
};

/**
 * セーフバリデーション関数（エラーを投げずに結果を返す）
 */
export const safeValidateApiResponse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const validatedData = validateApiResponse(schema, data, context);
    return { success: true, data: validatedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * 型安全なAPIコール用ヘルパー
 */
export class TypeSafeApiClient {
  /**
   * 型安全なGETリクエスト
   */
  static async get<T>(
    url: string,
    responseSchema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return validateApiResponse(responseSchema, data, `GET ${url}`);
  }

  /**
   * 型安全なPOSTリクエスト
   */
  static async post<TRequest, TResponse>(
    url: string,
    requestData: TRequest,
    requestSchema: z.ZodSchema<TRequest>,
    responseSchema: z.ZodSchema<TResponse>,
    options?: RequestInit
  ): Promise<TResponse> {
    // リクエストデータをバリデーション
    const validatedRequest = validateApiResponse(requestSchema, requestData, `POST ${url} request`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(validatedRequest),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    return validateApiResponse(responseSchema, responseData, `POST ${url} response`);
  }
}

/**
 * よく使用するスキーマの組み合わせ
 */
export const CommonSchemas = {
  // API レスポンススキーマ
  UserInfoResponse: ApiResponseSchema(UserInfoSchema),
  PresentationListResponse: ApiResponseSchema(z.array(PresentationInfoSchema)),
  PresentationResponse: ApiResponseSchema(PresentationInfoSchema),
  SlideListResponse: ApiResponseSchema(z.array(SlideInfoSchema)),
  SlideResponse: ApiResponseSchema(SlideInfoSchema),
  AnalyticsApiResponse: ApiResponseSchema(AnalyticsResponseSchema),

  // ページネーション付きレスポンス
  PaginatedPresentations: PaginatedResponseSchema(PresentationInfoSchema),
  PaginatedSlides: PaginatedResponseSchema(SlideInfoSchema),

  // 基本的な成功レスポンス
  BooleanResponse: ApiResponseSchema(z.boolean()),
  StringResponse: ApiResponseSchema(z.string()),
  NumberResponse: ApiResponseSchema(z.number()),
} as const;

/**
 * カスタムバリデーションルール
 */
export const CustomValidators = {
  /**
   * プレゼンテーションタイトルの検証
   */
  presentationTitle: z.string()
    .min(1, 'プレゼンテーションタイトルは必須です')
    .max(200, 'プレゼンテーションタイトルは200文字以内で入力してください')
    .refine((value) => value.trim().length > 0, 'タイトルは空白のみでは設定できません'),

  /**
   * スライド質問文の検証
   */
  slideQuestion: z.string()
    .min(1, '質問文は必須です')
    .max(500, '質問文は500文字以内で入力してください')
    .refine((value) => value.trim().length > 0, '質問文は空白のみでは設定できません'),

  /**
   * 多肢選択式の選択肢検証
   */
  multipleChoiceOptions: z.array(z.string())
    .min(2, '選択肢は最低2つ必要です')
    .max(10, '選択肢は最大10個まで設定できます')
    .refine(
      (options) => options.every(option => option.trim().length > 0),
      '空の選択肢は設定できません'
    )
    .refine(
      (options) => new Set(options).size === options.length,
      '重複する選択肢は設定できません'
    ),

  /**
   * アクセスコードの検証
   */
  accessCode: z.string()
    .length(6, 'アクセスコードは6文字で入力してください')
    .regex(/^[A-Z0-9]+$/, 'アクセスコードは大文字のアルファベットと数字のみ使用できます'),
} as const;