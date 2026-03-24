import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CampaignStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb' })
  filters: any; // Tags, Atributos customizados, etc.

  @Column()
  accountId: number;

  @Column()
  inboxId: number;

  @Column({ nullable: true })
  inboxName: string;

  @Column({ nullable: true })
  chatwootToken: string;

  @Column({ default: 'default' })
  evolutionInstance: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.PENDING,
  })
  status: CampaignStatus;

  @Column({ type: 'int', default: 0 })
  totalContacts: number;

  @Column({ type: 'int', default: 0 })
  sentSuccess: number;

  @Column({ type: 'int', default: 0 })
  sentError: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
