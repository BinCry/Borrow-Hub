import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  AnalyticsEventType,
  DisputeEventType,
  DisputeStatus,
  HandoverStatus,
  HandoverType,
  NotificationType,
  Prisma,
  RentalStatus,
  RoleName,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import {
  AcceptDamageReportDto,
  AnalyzeDisputeImagesDto,
  AssignDisputeDto,
  CreateDisputeDto,
  DisputeQueryDto,
  RespondDisputeDto,
  UpdateDisputeStatusDto,
} from './disputes.dto';

function disputeStatusLabel(status: DisputeStatus): string {
  const labels: Record<DisputeStatus, string> = {
    OPEN: 'mới mở', WAITING_RESPONSE: 'chờ phản hồi', UNDER_REVIEW: 'đang xử lý',
    RESOLVED: 'đã giải quyết', REJECTED: 'đã từ chối', CLOSED: 'đã đóng',
  };
  return labels[status];
}

const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.OPEN,
  DisputeStatus.WAITING_RESPONSE,
  DisputeStatus.UNDER_REVIEW,
];

const TERMINAL_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.RESOLVED,
  DisputeStatus.REJECTED,
  DisputeStatus.CLOSED,
];

const ALLOWED_DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  [DisputeStatus.OPEN]: [
    DisputeStatus.WAITING_RESPONSE,
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.CLOSED,
  ],
  [DisputeStatus.WAITING_RESPONSE]: [
    DisputeStatus.UNDER_REVIEW,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.CLOSED,
  ],
  [DisputeStatus.UNDER_REVIEW]: [
    DisputeStatus.WAITING_RESPONSE,
    DisputeStatus.RESOLVED,
    DisputeStatus.REJECTED,
    DisputeStatus.CLOSED,
  ],
  [DisputeStatus.RESOLVED]: [],
  [DisputeStatus.REJECTED]: [],
  [DisputeStatus.CLOSED]: [],
};

@Injectable()
export class DisputesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DisputesService.name);
  private analysisTimer?: NodeJS.Timeout;
  private isProcessingAnalyses = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
    private readonly notificationsService: NotificationsService,
    private readonly trustScoreService: TrustScoreService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  onModuleInit() {
    void this.processAutomaticAnalyses();
    this.analysisTimer = setInterval(() => void this.processAutomaticAnalyses(), 20_000);
    this.analysisTimer.unref();
  }

  onModuleDestroy() {
    if (this.analysisTimer) clearInterval(this.analysisTimer);
  }

  async analyzeDamageImages(
    _currentUser: AuthenticatedUser | null,
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ) {
    if (files.length !== 2) {
      throw new BadRequestException('Exactly two images are required: before and after rental');
    }

    if (files.some((file) => !file.mimetype.startsWith('image/'))) {
      throw new BadRequestException('Only image files are supported');
    }

    const provider = this.configService.get<string>('AI_PROVIDER') ?? 'gemini';
    if (provider === 'gemini') {
      return this.analyzeDamageImagesWithGemini(files);
    }
    if (provider === 'groq') {
      return this.analyzeDamageImagesWithGroq(files);
    }
    if (provider !== 'openai') {
      throw new BadRequestException(`Unsupported AI_PROVIDER: ${provider}`);
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured on the API server');
    }

    const imageData = files.map(
      (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    );
    const model = this.configService.get<string>('OPENAI_VISION_MODEL') ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  'Bạn là AI hỗ trợ phân tích tranh chấp tài sản cho nền tảng cho thuê.',
                  'Ảnh 1 là ảnh sản phẩm do chủ đăng trong bài, ảnh 2 là ảnh bằng chứng sau khi thuê. Ảnh bài đăng không chứng minh chắc tình trạng lúc bàn giao.',
                  'Hãy so sánh cùng một tài sản, chỉ kết luận hư hỏng mới khi có bằng chứng hình ảnh rõ ràng.',
                  'Không được tự quyết định tranh chấp; chỉ đưa ra đề xuất để admin xem xét.',
                  'Nếu ảnh không cùng tài sản, góc chụp quá khác hoặc không đủ rõ, hãy đặt damaged=false và nêu hạn chế.',
                ].join(' '),
              },
              { type: 'input_image', image_url: imageData[0], detail: 'high' },
              { type: 'input_image', image_url: imageData[1], detail: 'high' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'damage_analysis',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                damaged: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                severity: { type: 'string', enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'] },
                summary: { type: 'string' },
                findings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      area: { type: 'string' },
                      issue: { type: 'string' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                    },
                    required: ['area', 'issue', 'confidence'],
                  },
                },
                recommendedAction: { type: 'string' },
                suggestedCompensation: { type: 'integer', minimum: 0 },
                limitations: { type: 'array', items: { type: 'string' } },
              },
              required: [
                'damaged',
                'confidence',
                'severity',
                'summary',
                'findings',
                'recommendedAction',
                'suggestedCompensation',
                'limitations',
              ],
            },
          },
        },
      }),
    });

    const payload = (await response.json()) as {
      output_text?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.output_text) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'The vision model did not return an analysis',
      );
    }

    try {
      return { model, ...JSON.parse(payload.output_text) };
    } catch {
      throw new ServiceUnavailableException('The vision model returned an invalid analysis');
    }
  }

  private async analyzeDamageImagesWithGemini(
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured on the API server');
    }

    const model = this.configService.get<string>('GEMINI_VISION_MODEL') ?? 'gemini-3.8-flash';
    const prompt = [
      'Bạn là AI hỗ trợ phân tích tranh chấp tài sản cho nền tảng cho thuê.',
      'Ảnh 1 là ảnh sản phẩm do chủ đăng trong bài, ảnh 2 là ảnh bằng chứng sau khi thuê. Ảnh bài đăng không chứng minh chắc tình trạng lúc bàn giao.',
      'Hãy so sánh cùng một tài sản, chỉ kết luận hư hỏng mới khi có bằng chứng hình ảnh rõ ràng.',
      'Không được tự quyết định tranh chấp; chỉ đưa ra đề xuất để admin xem xét.',
      'Nếu ảnh không cùng tài sản, góc chụp quá khác hoặc không đủ rõ, hãy đặt damaged=false và nêu hạn chế.',
      'Chỉ trả về JSON đúng theo schema được yêu cầu.',
    ].join(' ');
    const parts = [
      { text: prompt },
      ...files.map((file) => ({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      })),
    ];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                damaged: { type: 'BOOLEAN' },
                confidence: { type: 'NUMBER' },
                severity: { type: 'STRING', enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'] },
                summary: { type: 'STRING' },
                findings: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      area: { type: 'STRING' },
                      issue: { type: 'STRING' },
                      confidence: { type: 'NUMBER' },
                    },
                    required: ['area', 'issue', 'confidence'],
                  },
                },
                recommendedAction: { type: 'STRING' },
                suggestedCompensation: { type: 'INTEGER' },
                limitations: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: [
                'damaged',
                'confidence',
                'severity',
                'summary',
                'findings',
                'recommendedAction',
                'suggestedCompensation',
                'limitations',
              ],
            },
          },
        }),
      },
    );
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    const outputText = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!response.ok || !outputText) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'Gemini did not return an analysis',
      );
    }

    try {
      return { model, provider: 'gemini', ...JSON.parse(outputText) };
    } catch {
      throw new ServiceUnavailableException('Gemini returned an invalid analysis');
    }
  }

  private async analyzeDamageImagesWithGroq(
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not configured on the API server');
    }

    const model = this.configService.get<string>('GROQ_VISION_MODEL') ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
    const imageData = files.map((file) => ({
      type: 'image_url',
      image_url: {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      },
    }));
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        damaged: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        severity: { type: 'string', enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'] },
        summary: { type: 'string' },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              area: { type: 'string' },
              issue: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['area', 'issue', 'confidence'],
          },
        },
        recommendedAction: { type: 'string' },
        suggestedCompensation: { type: 'integer', minimum: 0 },
        limitations: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'damaged',
        'confidence',
        'severity',
        'summary',
        'findings',
        'recommendedAction',
        'suggestedCompensation',
        'limitations',
      ],
    };
    const prompt = [
      'Bạn là AI hỗ trợ phân tích tranh chấp tài sản cho nền tảng cho thuê.',
      'Ảnh đầu tiên là ảnh sản phẩm do chủ đăng trong bài, ảnh thứ hai là ảnh bằng chứng sau khi thuê. Ảnh bài đăng không chứng minh chắc tình trạng lúc bàn giao.',
      'Hãy so sánh cùng một tài sản, chỉ kết luận hư hỏng mới khi có bằng chứng hình ảnh rõ ràng.',
      'Không tự quyết định tranh chấp; chỉ đưa ra đề xuất để admin xem xét.',
      'Nếu ảnh không cùng tài sản, góc chụp quá khác hoặc không đủ rõ, đặt damaged=false và nêu hạn chế.',
      'Chỉ trả về JSON theo schema.',
    ].join(' ');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: prompt }, ...imageData],
        }],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'damage_analysis', strict: true, schema },
        },
      }),
    });
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    const outputText = payload.choices?.[0]?.message?.content;
    if (!response.ok || !outputText) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'Groq did not return an analysis',
      );
    }

    try {
      return { model, provider: 'groq', ...JSON.parse(outputText) };
    } catch {
      throw new ServiceUnavailableException('Groq returned an invalid analysis');
    }
  }

  async create(currentUser: AuthenticatedUser, dto: CreateDisputeDto) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: dto.rentalId },
      include: this.rentalAccessInclude(),
    });

    if (!rental) {
      throw new NotFoundException('Rental request not found');
    }

    if (
      ![rental.ownerId, rental.renterId].includes(currentUser.id) &&
      !this.isStaff(currentUser)
    ) {
      throw new ForbiddenException('You cannot open a dispute for this rental');
    }

    const existing = await this.prisma.dispute.findFirst({
      where: {
        rentalId: rental.id,
        status: {
          in: ACTIVE_DISPUTE_STATUSES,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This rental already has an active dispute');
    }

    const evidenceRecords = await this.loadEvidenceForRental(
      rental.id,
      dto.evidenceIds,
      currentUser.id,
    );

    let dispute: Awaited<ReturnType<typeof this.prisma.dispute.create>>;
    try {
      dispute = await this.prisma.$transaction(async (tx) => {
        const created = await tx.dispute.create({
          data: {
            rentalId: rental.id,
            openedById: currentUser.id,
            reason: dto.reason,
            description: dto.description,
            status: DisputeStatus.OPEN,
            events: {
              create: {
                actorId: currentUser.id,
                eventType: DisputeEventType.OPENED,
                content: dto.description,
                metadata: {
                  reason: dto.reason,
                },
              },
            },
            evidences: evidenceRecords.length
              ? {
                  create: evidenceRecords.map((evidence) => ({
                    evidenceId: evidence.id,
                    uploadedById: currentUser.id,
                  })),
                }
              : undefined,
          },
          include: this.disputeInclude(),
        });

        await tx.rentalRequest.update({
          where: { id: rental.id },
          data: {
            status: RentalStatus.DISPUTED,
          },
        });

        if (rental.payout) {
          await tx.payout.update({
            where: { id: rental.payout.id },
            data: {
              status: 'BLOCKED',
            },
          });
        }

        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException('This rental already has an active dispute');
      }
      throw error;
    }

    await this.notificationsService.createMany(
      [rental.ownerId, rental.renterId].filter(
        (userId) => userId !== currentUser.id,
      ),
      {
        type: NotificationType.SYSTEM,
        title: 'Tranh chấp mới được mở',
        content: `${currentUser.fullName} vừa mở tranh chấp cho đơn thuê "${rental.asset.title}".`,
        referenceType: 'dispute',
        referenceId: dispute.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.create',
      entityType: 'dispute',
      entityId: dispute.id,
      afterData: {
        rentalId: rental.id,
        status: dispute.status,
        reason: dispute.reason,
      },
    });

    await this.analyticsService.track({
      eventType: AnalyticsEventType.DISPUTE_OPENED,
      userId: currentUser.id,
      entityType: 'dispute',
      entityId: dispute.id,
      metadata: {
        rentalId: rental.id,
        source: 'disputes.create',
      },
    });

    await this.recalculateParticipantsTrustScore(rental.ownerId, rental.renterId);

    return dispute;
  }

  listMine(currentUser: AuthenticatedUser, query: DisputeQueryDto) {
    const where: Prisma.DisputeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...this.buildScopeFilter(currentUser, query.role),
    };

    return this.prisma.dispute.findMany({
      where,
      include: this.disputeInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listForStaff(query: DisputeQueryDto) {
    return this.prisma.dispute.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: this.disputeInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getById(disputeId: string, currentUser: AuthenticatedUser) {
    return this.findAccessibleDispute(disputeId, currentUser);
  }

  async analyzeForDispute(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: AnalyzeDisputeImagesDto,
  ) {
    this.assertDisputeManager(currentUser);
    await this.findAccessibleDispute(disputeId, currentUser);
    return this.analyzeSelectedImages(disputeId, dto, currentUser.id);
  }

  private async analyzeSelectedImages(
    disputeId: string,
    dto: AnalyzeDisputeImagesDto,
    actorId: string | null,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: this.disputeInclude(),
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    this.ensureMutable(dispute.status);

    const before = dispute.rental.asset.images.find((image) => image.id === dto.assetImageId);
    const after = dispute.evidences.find((item) => item.evidenceId === dto.evidenceId)?.evidence;
    if (!before?.fileKey || !after?.fileKey || after.type !== 'PHOTO') {
      throw new BadRequestException('Select a listing image and a dispute photo stored in the app');
    }

    const imageBuffers = await Promise.all([
      this.storageService.readAssetImage(before.fileKey),
      this.storageService.readAssetImage(after.fileKey),
    ]);
    const files = await Promise.all(imageBuffers.map(async (buffer, index) => {
      if (buffer.length > 15 * 1024 * 1024) {
        throw new BadRequestException('Image exceeds the size limit');
      }
      try {
        const normalized = await sharp(buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        return {
          originalname: index === 0 ? 'listing-before.jpg' : 'dispute-after.jpg',
          mimetype: 'image/jpeg',
          size: normalized.length,
          buffer: normalized,
        };
      } catch {
        throw new BadRequestException('One of the selected files is not a readable image');
      }
    }));

    const analysis = await this.analyzeDamageImages(null, files);
    const current = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: this.disputeInclude(),
    });
    if (!current) throw new NotFoundException('Dispute not found');
    this.ensureMutable(current.status);

    await this.prisma.disputeEvent.create({
      data: {
        disputeId,
        actorId,
        eventType: DisputeEventType.NOTE,
        content: 'AI đã so sánh ảnh trước và sau, đưa ra đề xuất để quản trị viên xem xét.',
        metadata: JSON.parse(JSON.stringify({
          kind: 'AI_DAMAGE_ANALYSIS',
          assetImageId: before.id,
          evidenceId: after.id,
          result: analysis,
        })) as Prisma.InputJsonValue,
      },
    });

    return this.prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
      include: this.disputeInclude(),
    });
  }

  private async processAutomaticAnalyses() {
    if (this.isProcessingAnalyses) return;
    this.isProcessingAnalyses = true;
    try {
      const disputes = await this.prisma.dispute.findMany({
        where: { reason: 'RETURN_ISSUE', status: { in: ACTIVE_DISPUTE_STATUSES } },
        include: this.disputeInclude(),
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      for (const dispute of disputes) {
        const before = dispute.rental.asset.images.find((image) => image.isCover && image.fileKey)
          ?? dispute.rental.asset.images.find((image) => image.fileKey);
        const after = [...dispute.evidences]
          .filter((item) => item.evidence.type === 'PHOTO' && item.evidence.fileKey)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
        if (!before || !after) continue;

        const matchingEvents = dispute.events.filter((event) => {
          const metadata = event.metadata as Record<string, unknown> | null;
          return metadata?.assetImageId === before.id && metadata?.evidenceId === after.evidenceId;
        });
        if (matchingEvents.some((event) => (event.metadata as Record<string, unknown> | null)?.kind === 'AI_DAMAGE_ANALYSIS')) continue;

        const failed = matchingEvents.filter((event) => (event.metadata as Record<string, unknown> | null)?.kind === 'AI_ANALYSIS_FAILED');
        if (failed.length >= 3) continue;
        const lastFailed = failed.at(-1);
        if (lastFailed && Date.now() - lastFailed.createdAt.getTime() < failed.length * 60_000) continue;

        try {
          await this.analyzeSelectedImages(dispute.id, {
            assetImageId: before.id,
            evidenceId: after.evidenceId,
          }, null);
        } catch (error) {
          this.logger.warn(`AI analysis failed for dispute ${dispute.id}: ${error instanceof Error ? error.message : String(error)}`);
          await this.prisma.disputeEvent.create({
            data: {
              disputeId: dispute.id,
              eventType: DisputeEventType.NOTE,
              content: 'AI chưa thể phân tích ảnh. Hệ thống sẽ thử lại; admin vẫn có thể xem bằng chứng.',
              metadata: {
                kind: 'AI_ANALYSIS_FAILED',
                assetImageId: before.id,
                evidenceId: after.evidenceId,
                attempt: failed.length + 1,
              },
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Cannot process dispute analyses: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isProcessingAnalyses = false;
    }
  }

  async respond(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: RespondDisputeDto,
  ) {
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);

    this.ensureMutable(dispute.status);

    const evidenceRecords = await this.loadEvidenceForRental(
      dispute.rentalId,
      dto.evidenceIds,
      currentUser.id,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: DisputeEventType.RESPONSE_ADDED,
          content: dto.content,
        },
      });

      if (evidenceRecords.length) {
        await tx.disputeEvidence.createMany({
          data: evidenceRecords.map((evidence) => ({
            disputeId: dispute.id,
            evidenceId: evidence.id,
            uploadedById: currentUser.id,
          })),
          skipDuplicates: true,
        });

        await tx.disputeEvent.create({
          data: {
            disputeId: dispute.id,
            actorId: currentUser.id,
            eventType: DisputeEventType.EVIDENCE_ATTACHED,
            content: `Đã đính kèm ${evidenceRecords.length} bằng chứng`,
          },
        });
      }

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status:
            dispute.status === DisputeStatus.OPEN
              ? DisputeStatus.WAITING_RESPONSE
              : DisputeStatus.UNDER_REVIEW,
        },
      });

      return tx.dispute.findUniqueOrThrow({
        where: { id: dispute.id },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tranh chấp có phản hồi mới',
        content: `${currentUser.fullName} vừa cập nhật tranh chấp cho đơn "${updated.rental.asset.title}".`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.respond',
      entityType: 'dispute',
      entityId: updated.id,
      afterData: {
        status: updated.status,
        respondedWithEvidence: evidenceRecords.length > 0,
      },
    });

    return updated;
  }

  async acceptDamageReport(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: AcceptDamageReportDto,
  ) {
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);
    this.ensureMutable(dispute.status);

    if (dispute.reason !== 'RETURN_ISSUE') {
      throw new BadRequestException('This dispute is not a damage report');
    }

    if (currentUser.id !== dispute.rental.renterId) {
      throw new ForbiddenException(
        'Only the renter can accept this damage report',
      );
    }

    if (dispute.openedById !== dispute.rental.ownerId) {
      throw new BadRequestException(
        'Only owner-opened damage reports can be accepted by renter',
      );
    }

    const resolutionSummary =
      dto.note?.trim() || 'Người thuê đã chấp nhận báo cáo hư hỏng và chi phí sửa chữa';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: DisputeEventType.RESOLVED,
          content: dto.note?.trim() || 'Người thuê đã chấp nhận báo cáo hư hỏng.',
          metadata: {
            acceptedByRenter: true,
          },
        },
      });

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: DisputeStatus.RESOLVED,
          resolutionSummary,
          resolvedAt: new Date(),
        },
      });

      await tx.rentalRequest.update({
        where: { id: dispute.rentalId },
        data: {
          status: RentalStatus.COMPLETED,
        },
      });

      await this.restoreBlockedPayoutIfNeeded(tx, dispute.rental.payout);

      return tx.dispute.findUniqueOrThrow({
        where: { id: dispute.id },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Báo cáo hư hỏng đã được chấp nhận',
        content: `Người thuê đã chấp nhận báo cáo hư hỏng cho đơn "${updated.rental.asset.title}".`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.damage-report.accept',
      entityType: 'dispute',
      entityId: updated.id,
      afterData: {
        status: updated.status,
        resolutionSummary: updated.resolutionSummary,
      },
    });

    await this.recalculateParticipantsTrustScore(
      updated.rental.ownerId,
      updated.rental.renterId,
    );

    return updated;
  }

  async assign(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: AssignDisputeDto,
  ) {
    this.assertDisputeManager(currentUser);
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      const assigneeRoles = assignee.userRoles.map(({ role }) => role.name);
      if (
        !assigneeRoles.some((role) =>
          this.disputeManagerRoles().includes(role),
        )
      ) {
        throw new BadRequestException('Assignee must be a staff account');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextStatus =
        dispute.status === DisputeStatus.OPEN ||
        dispute.status === DisputeStatus.WAITING_RESPONSE
          ? DisputeStatus.UNDER_REVIEW
          : dispute.status;

      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: DisputeEventType.ASSIGNED,
          content: dto.assignedToId
            ? `Đã phân công xử lý cho ${dto.assignedToId}`
            : 'Đã bỏ phân công xử lý',
        },
      });

      return tx.dispute.update({
        where: { id: dispute.id },
        data: {
          assignedToId: dto.assignedToId ?? null,
          status: nextStatus,
        },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tranh chấp được phân công xử lý',
        content: `Tranh chấp cho đơn "${updated.rental.asset.title}" vừa được cập nhật người phụ trách.`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.assign',
      entityType: 'dispute',
      entityId: updated.id,
      beforeData: { assignedToId: dispute.assignedToId },
      afterData: { assignedToId: updated.assignedToId, status: updated.status },
    });

    return updated;
  }

  async updateStatus(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateDisputeStatusDto,
  ) {
    this.assertDisputeManager(currentUser);
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);

    this.ensureStatusTransition(dispute.status, dto.status);

    if (
      TERMINAL_DISPUTE_STATUSES.includes(dto.status) &&
      !dto.resolutionSummary
    ) {
      throw new BadRequestException(
        'resolutionSummary is required for terminal dispute statuses',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const returnConfirmed = dispute.rental.handovers.some(
        (handover) =>
          handover.type === HandoverType.RETURN &&
          handover.status === HandoverStatus.CONFIRMED,
      );

      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: TERMINAL_DISPUTE_STATUSES.includes(dto.status)
            ? DisputeEventType.RESOLVED
            : DisputeEventType.STATUS_CHANGED,
          content: dto.note ?? `Trạng thái tranh chấp: ${disputeStatusLabel(dto.status)}`,
          metadata: dto.resolutionSummary
            ? {
                resolutionSummary: dto.resolutionSummary,
              }
            : undefined,
        },
      });

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: dto.status,
          resolutionSummary: dto.resolutionSummary ?? dispute.resolutionSummary,
          resolvedAt: TERMINAL_DISPUTE_STATUSES.includes(dto.status)
            ? new Date()
            : null,
        },
      });

      await tx.rentalRequest.update({
        where: { id: dispute.rentalId },
        data: {
          status:
            TERMINAL_DISPUTE_STATUSES.includes(dto.status) && returnConfirmed
              ? RentalStatus.COMPLETED
              : RentalStatus.DISPUTED,
        },
      });

      if (TERMINAL_DISPUTE_STATUSES.includes(dto.status) && returnConfirmed) {
        await this.restoreBlockedPayoutIfNeeded(tx, dispute.rental.payout);
      }

      return tx.dispute.findUniqueOrThrow({
        where: { id: dispute.id },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tranh chấp đổi trạng thái',
        content: `Tranh chấp cho đơn "${updated.rental.asset.title}" đã chuyển sang ${disputeStatusLabel(updated.status)}.`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.status.update',
      entityType: 'dispute',
      entityId: updated.id,
      beforeData: { status: dispute.status },
      afterData: {
        status: updated.status,
        resolutionSummary: updated.resolutionSummary,
      },
    });

    await this.recalculateParticipantsTrustScore(
      updated.rental.ownerId,
      updated.rental.renterId,
    );

    return updated;
  }

  private async findAccessibleDispute(
    disputeId: string,
    currentUser: AuthenticatedUser,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: this.disputeInclude(),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const canAccess =
      dispute.openedById === currentUser.id ||
      dispute.rental.ownerId === currentUser.id ||
      dispute.rental.renterId === currentUser.id ||
      dispute.assignedToId === currentUser.id ||
      this.isStaff(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this dispute');
    }

    return dispute;
  }

  private async loadEvidenceForRental(
    rentalId: string,
    evidenceIds: string[] | undefined,
    currentUserId: string,
  ) {
    if (!evidenceIds?.length) {
      return [];
    }

    const evidences = await this.prisma.evidence.findMany({
      where: {
        id: {
          in: evidenceIds,
        },
        rentalId,
      },
    });

    if (evidences.length !== evidenceIds.length) {
      throw new BadRequestException(
        'Some evidence items were not found for this rental',
      );
    }

    const unauthorized = evidences.some(
      (evidence) =>
        evidence.uploadedBy !== currentUserId && evidence.handoverId === null,
    );

    if (unauthorized) {
      throw new ForbiddenException(
        'You can only attach your own standalone evidence records',
      );
    }

    return evidences;
  }

  private ensureMutable(status: DisputeStatus) {
    if (TERMINAL_DISPUTE_STATUSES.includes(status)) {
      throw new ConflictException('This dispute has already been closed');
    }
  }

  private ensureStatusTransition(current: DisputeStatus, next: DisputeStatus) {
    if (!ALLOWED_DISPUTE_TRANSITIONS[current].includes(next)) {
      throw new ConflictException(
        `Cannot change dispute status from ${current} to ${next}`,
      );
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private buildScopeFilter(
    currentUser: AuthenticatedUser,
    role: DisputeQueryDto['role'],
  ): Prisma.DisputeWhereInput {
    if (role === 'opened') {
      return { openedById: currentUser.id };
    }

    if (role === 'assigned') {
      if (!this.isStaff(currentUser)) {
        return { id: '__no_results__' };
      }

      return { assignedToId: currentUser.id };
    }

    return {
      OR: [
        { openedById: currentUser.id },
        { rental: { ownerId: currentUser.id } },
        { rental: { renterId: currentUser.id } },
        ...(this.isStaff(currentUser)
          ? [{ assignedToId: currentUser.id }]
          : []),
      ],
    };
  }

  private collectDisputeWatchers(
    dispute: Awaited<ReturnType<DisputesService['findAccessibleDispute']>>,
    actorId: string,
  ) {
    return [...new Set([
      dispute.openedById,
      dispute.rental.ownerId,
      dispute.rental.renterId,
      dispute.assignedToId,
    ])].filter(
      (userId): userId is string => Boolean(userId && userId !== actorId),
    );
  }

  private async restoreBlockedPayoutIfNeeded(
    tx: Prisma.TransactionClient,
    payout: { id: string; status: string } | null | undefined,
  ) {
    if (!payout || payout.status !== 'BLOCKED') {
      return;
    }

    await tx.payout.update({
      where: { id: payout.id },
      data: {
        status: 'PENDING',
      },
    });
  }

  private async recalculateParticipantsTrustScore(ownerId: string, renterId: string) {
    await Promise.all([
      this.trustScoreService.recalculateUserTrustScore(ownerId),
      this.trustScoreService.recalculateUserTrustScore(renterId),
    ]);
  }

  private disputeInclude() {
    return {
      rental: {
        include: {
          asset: { include: { images: { orderBy: { sortOrder: 'asc' as const } } } },
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          handovers: true,
          payout: true,
        },
      },
      openedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      evidences: {
        include: {
          evidence: true,
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      events: {
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'asc' as const }],
      },
    } satisfies Prisma.DisputeInclude;
  }

  private rentalAccessInclude() {
    return {
      asset: true,
      owner: true,
      renter: true,
      payout: true,
    } satisfies Prisma.RentalRequestInclude;
  }

  private assertDisputeManager(currentUser: AuthenticatedUser) {
    if (
      !currentUser.roles.some((role) =>
        this.disputeManagerRoles().includes(role),
      )
    ) {
      throw new ForbiddenException('Only dispute staff can perform this action');
    }
  }

  private disputeManagerRoles(): RoleName[] {
    return [
      RoleName.DISPUTE_OFFICER,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];
  }

  private isStaff(currentUser: AuthenticatedUser) {
    const staffRoles: RoleName[] = [
      RoleName.MODERATOR,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.DISPUTE_OFFICER,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];

    return currentUser.roles.some((role) => staffRoles.includes(role));
  }
}
