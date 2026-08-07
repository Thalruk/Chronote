using Backend.Models;
using Chronote.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Backend.DTOs;

namespace Chronote.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotesController(ApplicationDbContext context)
    {
        _context = context;
    }
    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? string.Empty;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NoteResponseDto>>> GetNotes(
     [FromQuery] int page = 1,
     [FromQuery] int pageSize = 100)
    {
        var userId = GetUserId();

        var notes = await _context.Notes
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NoteResponseDto(n.Id, n.Title, n.Content, n.CreatedAt, n.TargetDate, n.TargetTime))
            .ToListAsync();

        return Ok(notes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NoteResponseDto>> GetNote(Guid id)
    {
        var userId = GetUserId();
        var note = await _context.Notes.FindAsync(id);

        if (note == null || note.UserId != userId) return NotFound();

        return Ok(new NoteResponseDto(note.Id, note.Title, note.Content, note.CreatedAt, note.TargetDate, note.TargetTime));
    }

    [HttpPost]
    public async Task<ActionResult<NoteResponseDto>> CreateNote(CreateNoteDto dto)
    {
        var note = new Note
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Content = dto.Content,
            CreatedAt = DateTime.UtcNow,
            UserId = GetUserId(),
            TargetDate = dto.TargetDate,
            TargetTime = dto.TargetTime
        };

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();

        var response = new NoteResponseDto(note.Id, note.Title, note.Content, note.CreatedAt, note.TargetDate, note.TargetTime);
        return CreatedAtAction(nameof(GetNote), new { id = note.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(Guid id, UpdateNoteDto dto)
    {
        if (id != dto.Id) return BadRequest();

        var userId = GetUserId();
        var existingNote = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);

        if (existingNote == null || existingNote.UserId != userId) return NotFound();

        existingNote.Title = dto.Title;
        existingNote.Content = dto.Content;
        existingNote.TargetDate = dto.TargetDate;
        existingNote.TargetTime = dto.TargetTime;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var userId = GetUserId();
        var note = await _context.Notes.FindAsync(id);

        if (note == null || note.UserId != userId) return NotFound();

        _context.Notes.Remove(note);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
        }

        return NoContent();
    }
}
