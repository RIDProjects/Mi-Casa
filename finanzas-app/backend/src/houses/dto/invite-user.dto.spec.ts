import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InviteUserDto, CreateMemberDto } from './invite-user.dto';

const props = async (cls: any, body: object) =>
  (await validate(plainToInstance(cls, body), { whitelist: true })).map((e) => e.property);

describe('InviteUserDto', () => {
  it('rejects a missing email', async () => {
    expect(await props(InviteUserDto, {})).toContain('email');
  });

  it('rejects an unknown role', async () => {
    expect(await props(InviteUserDto, { email: 'a@b.com', role: 'admin' })).toContain('role');
  });

  it('accepts user and house_admin roles and lowercases the email', async () => {
    const dto = plainToInstance(InviteUserDto, { email: '  Juan@X.com ', role: 'house_admin' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('juan@x.com');
  });
});

describe('CreateMemberDto', () => {
  const valid = { name: 'Ana', email: 'ana@x.com', password: 'secret1' };

  it('rejects a missing password', async () => {
    expect(await props(CreateMemberDto, { name: 'Ana', email: 'ana@x.com' })).toContain('password');
  });

  it('rejects a missing email and short name', async () => {
    const failed = await props(CreateMemberDto, { name: 'A', password: 'secret1' });
    expect(failed).toEqual(expect.arrayContaining(['email', 'name']));
  });

  it('accepts a valid body', async () => {
    expect(await props(CreateMemberDto, valid)).toHaveLength(0);
  });
});
