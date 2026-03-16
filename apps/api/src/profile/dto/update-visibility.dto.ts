import { IsBoolean } from 'class-validator';

export class UpdateVisibilityDto {
  @IsBoolean()
  talentVisible: boolean;
}
