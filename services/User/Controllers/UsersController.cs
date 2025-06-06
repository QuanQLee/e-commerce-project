using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using User.Api.Domain;
using User.Api.Infrastructure;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace User.Api.Controllers;

[ApiController]
[Route("users")]
public class UsersController(UserDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserEntity>>> GetAll()
        => await db.Users.AsNoTracking().ToListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserEntity>> Get(Guid id)
        => await db.Users.FindAsync(id) is { } user ? Ok(user) : NotFound();

    public record CreateUserDto(string UserName, string Email);

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateUserDto dto)
    {
        var user = new UserEntity { UserName = dto.UserName, Email = dto.Email };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user.Id);
    }
}
